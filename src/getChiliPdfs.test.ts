import getChiliPdfs from "./getChiliPdfs";
import fs from "fs-extra";
import path from "path";
import { DiffConfig } from "./types";

jest.setTimeout(1.8e6);

const serverConfigPath = path.normalize(
    __dirname + "/../test_files/server_config.json"
);

const tempDirectory = path.normalize(__dirname + "/../test_files/temp");
fs.ensureDirSync(tempDirectory);

describe("getChiliPdfs()", () => {
    let configObj: DiffConfig | undefined;

    beforeAll(() => {
        const serverConfig = JSON.parse(
            fs.readFileSync(serverConfigPath, "utf8")
        );

        const configData: DiffConfig = {
            sourcePath: "",
            comparePath: path.normalize(tempDirectory + "/get_pdf_test"),
            server: serverConfig,
        };

        if (configObj == null) {
            return;
        }

        fs.emptydirSync(path.normalize(configObj.comparePath));
    });

    afterAll(() => {
        if (configObj == null) {
            return;
        }

        fs.emptydirSync(path.normalize(configObj.comparePath));
    });

    test("if given a proper config with 2 online documents we should get 2 success and 2 files properly named", async () => {
        if (configObj == null) {
            return;
        }

        const results = await getChiliPdfs(configObj);

        expect(results.length).toEqual(2);

        for (const result of results) {
            expect(result.successfulPdf).toEqual(true);
        }

        const downloadContents = fs.readdirSync(configObj.comparePath);

        expect(downloadContents.length).toEqual(2);

        for (const downloadContent of downloadContents) {
            expect(path.extname(downloadContent)).toEqual(".pdf");
        }
    });
});
