import processProgram from "./processProgram";
import path from "path";
import fs from "fs-extra";
import "jest";
import { csv2jsonAsync } from "json-2-csv";
import getDirectoryPdfs from "./getDirectoryPdfs";
import { DiffConfig } from "./types";

jest.setTimeout(1.8e6);

const sourceDirectory = path.normalize(__dirname + "/../test_files/source");
const serverConfigPath = path.normalize(
    __dirname + "/../test_files/server_config.json"
);
const compareDirectoryForLocalTesting = path.normalize(
    __dirname + "/../test_files/compare"
);
const tempDirectory = path.normalize(__dirname + "/../test_files/temp");

fs.ensureDirSync(tempDirectory);

describe("processProgram()", () => {
    describe("testing output based on input", () => {
        const tempDirectoryLocal = path.normalize(
            tempDirectory + "/outputOnInput"
        );

        beforeAll(() => {
            fs.emptyDirSync(tempDirectoryLocal);
        });

        afterAll(() => {
            fs.emptyDirSync(tempDirectoryLocal);
        });

        test("When give a proper config file we get a results file", async () => {
            const emptyPath = path.normalize(tempDirectoryLocal + "/empty");

            fs.emptydirSync(emptyPath);

            const configData: DiffConfig = {
                sourcePath: emptyPath,
                comparePath: emptyPath,
            };

            fs.writeFileSync(
                path.normalize(tempDirectoryLocal + "/configBlank.json"),
                JSON.stringify(configData),
                { encoding: "utf8" }
            );

            await processProgram(
                path.normalize(tempDirectoryLocal + "/configBlank.json"),
                tempDirectory
            );

            expect(
                fs.existsSync(path.normalize(tempDirectory + "/results.csv"))
            ).not.toBeNull();
        });
    });

    describe("testing results.csv with local files", () => {
        const tempDirectoryLocal = path.normalize(
            tempDirectory + "/results_with_local"
        );
        const resultsDirectoryLocal = path.normalize(
            tempDirectoryLocal + "/results"
        );

        let resultsJson: { different: boolean; path: string }[] = [
            { different: false, path: "" },
        ];

        beforeAll(async () => {
            fs.emptyDirSync(tempDirectoryLocal);
            fs.ensureDirSync(resultsDirectoryLocal);

            const configData: DiffConfig = {
                sourcePath: sourceDirectory,
                comparePath: compareDirectoryForLocalTesting,
            };

            fs.writeFileSync(
                path.normalize(tempDirectoryLocal + "/configTest.json"),
                JSON.stringify(configData),
                { encoding: "utf8" }
            );

            await processProgram(
                path.normalize(tempDirectoryLocal + "/configTest.json"),
                resultsDirectoryLocal
            );

            const resultsPath = path.normalize(
                resultsDirectoryLocal + "/results.csv"
            );

            const resultsFileExist = fs.existsSync(resultsPath);

            expect(resultsFileExist).toBeTruthy();

            resultsJson = await csv2jsonAsync(
                fs.readFileSync(resultsPath, "utf8")
            );
        });

        afterAll(() => {
            fs.emptyDirSync(tempDirectoryLocal);
        });

        const getShouldResults = () => {
            const directories = getDirectoryPdfs(
                compareDirectoryForLocalTesting
            );

            const resultsShouldJson: {
                different: boolean | null;
                path: string;
                name: string;
            }[] = [];

            for (const directory of directories) {
                const shouldBe = path
                    .basename(directory)
                    .replace(".pdf", "")
                    .split("@")[1];

                resultsShouldJson.push({
                    different:
                        shouldBe === "true" || shouldBe === "false"
                            ? shouldBe === "true"
                            : null,
                    path: directory,
                    name: path.basename(directory),
                });
            }

            return resultsShouldJson;
        };

        test.each(getShouldResults())("$name", (resultShould) => {
            const resultIs = resultsJson.find(
                (r) => r.path == resultShould.path
            );

            expect(resultIs).not.toBeNull();

            if (resultIs == null) return;

            expect(resultIs.different).toEqual(resultShould.different);
        });
    });

    describe("testing results.csv with online files", () => {
        const tempDirectoryLocal = path.normalize(
            tempDirectory + "/results_with_online"
        );
        const compareDirectoryLocal = path.normalize(
            tempDirectoryLocal + "/compare"
        );
        const resultsDirectoryLocal = path.normalize(
            tempDirectoryLocal + "/results"
        );

        let resultsJson: { different: boolean; path: string }[] = [
            { different: false, path: "" },
        ];

        beforeAll(async () => {
            fs.emptyDirSync(tempDirectoryLocal);
            fs.ensureDirSync(compareDirectoryLocal);
            fs.ensureDirSync(resultsDirectoryLocal);

            const serverConfig = JSON.parse(
                fs.readFileSync(serverConfigPath, "utf8")
            );

            const configData: DiffConfig = {
                sourcePath: sourceDirectory,
                comparePath: compareDirectoryLocal,
                server: serverConfig,
            };

            fs.writeFileSync(
                path.normalize(tempDirectoryLocal + "/configTest.json"),
                JSON.stringify(configData),
                { encoding: "utf8" }
            );

            await processProgram(
                path.normalize(tempDirectoryLocal + "/configTest.json"),
                resultsDirectoryLocal
            );

            const resultsPath = path.normalize(
                resultsDirectoryLocal + "/results.csv"
            );

            const resultsFileExist = fs.existsSync(resultsPath);

            expect(resultsFileExist).toBeTruthy();

            resultsJson = await csv2jsonAsync(
                fs.readFileSync(resultsPath, "utf8")
            );
        });

        const getShouldResults = () => {
            const config = JSON.parse(
                fs.readFileSync(serverConfigPath, "utf8")
            );

            if (config.documents == null) {
                return [];
            }

            const resultsShouldJson: {
                different: boolean | null;
                path: string;
                name: string;
            }[] = [];

            for (const document of config.documents) {
                if (document.name == null) {
                    continue;
                }

                const shouldBe = document.name
                    .replace(".pdf", "")
                    .split("@")[1];

                resultsShouldJson.push({
                    different:
                        shouldBe === "true" || shouldBe === "false"
                            ? shouldBe === "true"
                            : null,
                    path: path.normalize(
                        compareDirectoryLocal + "/" + document.name
                    ),
                    name: document.name,
                });
            }

            return resultsShouldJson;
        };

        afterAll(() => {
            fs.emptyDirSync(tempDirectoryLocal);
        });

        test.each(getShouldResults())("$name", (resultShould) => {
            const resultIs = resultsJson.find(
                (r) => r.path == resultShould.path
            );

            expect(resultIs).not.toBeNull();

            if (resultIs == null) return;

            expect(resultIs.different).toEqual(resultShould.different);
        });
    });
});
