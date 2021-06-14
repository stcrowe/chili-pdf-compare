import { ChiliTask, DiffConfig } from "./types";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { parse, validate } from "fast-xml-parser";
import { noTry, noTryAsync } from "no-try";
import { createWriteStream } from "fs";
import path from "path";
import ReadableStream = NodeJS.ReadableStream;

export default async function (
    config: DiffConfig
): Promise<Array<{ documentId: string; successfulPdf: boolean }>> {
    const results: { documentId: string; successfulPdf: boolean }[] = [];

    const checkConfig: DiffConfig = {
        comparePath: "",
        server: { apiKey: "", documents: [], url: "" },
        sourcePath: "",
    };

    if (config.server == null || typeof config.server != "object") {
        throw new Error("config missing server key");
    }

    for (const checkConfigKey in checkConfig.server) {
        if (!(config.server as Object).hasOwnProperty(checkConfigKey)) {
            throw new Error("config server is missing " + checkConfigKey);
        }
    }

    if (!(await isServerAcceptChiliRequest(config))) {
        throw new Error("cannot communicate with CHILI server - URL is bad");
    }

    if (!(await isKeyActive(config))) {
        throw new Error("cannot verify API key - API key is bad");
    }

    for (const document of config.server.documents) {
        const pdfExportSettingsXml = await getPdfExportSettingsXml(
            config,
            document.pdfId
        );

        if (pdfExportSettingsXml === false) {
            results.push({
                documentId: document.id,
                successfulPdf: false,
            });
            continue;
        }

        let chiliTask = await getChiliTaskForDocumentPdfRequest(
            config,
            document.id,
            pdfExportSettingsXml
        );

        while (
            chiliTask != false &&
            chiliTask.task.attr_finished != null &&
            chiliTask.task.attr_finished != "True"
        ) {
            chiliTask = await getTaskUpdate(config, chiliTask.task.attr_id);
        }

        if (
            chiliTask === false ||
            chiliTask.task.attr_finished == null ||
            chiliTask.task.attr_succeeded == "False"
        ) {
            results.push({
                documentId: document.id,
                successfulPdf: false,
            });
            continue;
        }

        try {
            await downloadPdf(config, chiliTask);
            results.push({
                documentId: document.id,
                successfulPdf: true,
            });
        } catch (e) {
            console.log(e);
            results.push({
                documentId: document.id,
                successfulPdf: false,
            });
        }
    }

    return results;
}

const axiosConfig: AxiosRequestConfig = {
    transformResponse: (data) => {
        const [validateXmlError, validateXml] = noTry(() => validate(data));

        if (validateXmlError != null) {
            return data;
        }

        return parse(data, {
            ignoreAttributes: false,
            attributeNamePrefix: "attr_",
            attrNodeName: false,
        });
    },
};

async function isServerAcceptChiliRequest(
    config: DiffConfig
): Promise<boolean> {
    const [error, response] = await noTryAsync<AxiosResponse>(
        async () =>
            await axios({
                url: config.server?.url + "/rest-api/v1/system/server/date",
                method: "get",
                data: {
                    apiKey: config.server?.apiKey,
                },
                ...axiosConfig,
            })
    );

    if (error != null) {
        return false;
    }

    return response?.data.date != null;
}

async function isKeyActive(config: DiffConfig): Promise<boolean> {
    const [error, response] = await noTryAsync<AxiosResponse>(
        async () =>
            await axios({
                url: config.server?.url + "/rest-api/v1/system/apikey/verify",
                method: "put",
                data: {
                    apiKey: config.server?.apiKey,
                },
                ...axiosConfig,
            })
    );

    return response?.data.ok != null;
}

async function getPdfExportSettingsXml(
    config: DiffConfig,
    pdfExportSettingsId: string
): Promise<string | false> {
    const [error, response] = await noTryAsync<AxiosResponse>(
        async () =>
            await axios({
                url:
                    config.server?.url +
                    `/rest-api/v1/resources/pdfexportsettings/items/${pdfExportSettingsId}/xml`,
                method: "get",
                headers: {
                    "api-key": config.server?.apiKey,
                },
            })
    );

    if (response != null) {
        return response.data;
    }

    return false;
}

async function getChiliTaskForDocumentPdfRequest(
    config: DiffConfig,
    documentId: string,
    pdfExportSettingsXml: string
): Promise<ChiliTask | false> {
    const [error, response] = await noTryAsync<AxiosResponse>(
        async () =>
            await axios({
                url:
                    config.server?.url +
                    `/rest-api/v1/resources/documents/${documentId}/representations/pdf`,
                method: "post",
                headers: {
                    "api-key": config.server?.apiKey,
                },
                data: {
                    settingsXML: pdfExportSettingsXml,
                },
                ...axiosConfig,
            })
    );

    if (response != null) {
        return response.data as ChiliTask;
    }

    return false;
}

async function getTaskUpdate(
    config: DiffConfig,
    taskId: string
): Promise<ChiliTask | false> {
    const [error, response] = await noTryAsync<AxiosResponse>(
        async () =>
            await axios({
                url:
                    config.server?.url +
                    `/rest-api/v1/system/tasks/${taskId}/status`,
                method: "get",
                headers: {
                    "api-key": config.server?.apiKey,
                },
            })
    );

    if (response != null) {
        return response.data;
    }

    return false;
}

async function downloadPdf(config: DiffConfig, chiliTask: ChiliTask) {
    const resultXml = chiliTask.task.attr_result
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&");

    const resultObj = parse(resultXml, {
        attributeNamePrefix: "attr_",
        ignoreAttributes: false,
    });

    if (resultObj.result.attr_url == null || resultObj.result.attr_url == "") {
        throw new Error("pdf failed");
    }

    const url = resultObj.result.attr_url;

    const [error, response] = await noTryAsync(
        async () =>
            await axios({
                method: "get",
                responseType: "stream",
                url: url,
            })
    );

    if (error != null) {
        throw error;
    }

    const fileName = path.basename(unescape(url));

    const writeStream = createWriteStream(config.comparePath + "/" + fileName);
    (response.data as ReadableStream).pipe(writeStream);

    await new Promise((result) => {
        writeStream.on("finish", () => {
            writeStream.close();
            result(true);
        });
        writeStream.on("error", result);
    });
}
