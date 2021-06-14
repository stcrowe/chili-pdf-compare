import fs from "fs-extra";
import chalk from "chalk";
import { noTry } from "no-try";
import { DiffConfig } from "./types";
import path from "path";

export default function (configPath: string): DiffConfig {
    if (!fs.existsSync(configPath)) {
        throw new Error("config path does not exist");
    }

    const itemState = fs.statSync(configPath);

    if (!itemState.isFile()) {
        throw new Error("config path is not a file");
    }

    const [fileError, fileData] = noTry(() =>
        fs.readFileSync(configPath, "utf8")
    );

    if (fileError != null) {
        throw new Error("file read error");
    }

    const [configError, configObj] = noTry(() => JSON.parse(fileData));

    if (configError != null) {
        throw new Error("json error");
    }

    if (!("sourcePath" in configObj)) {
        throw new Error("missing sourcePath in json");
    }

    if (!("comparePath" in configObj)) {
        if (configObj.comparePath == null) {
            const newDiffPath =
                (process as any).pkg != null
                    ? path.normalize(process.execPath + "/../tempDiffDownload")
                    : path.normalize(__dirname + "/../tempDiffDownload");
            fs.emptydirSync(newDiffPath);
            configObj.comparePath = newDiffPath;
        }
    }

    return configObj as DiffConfig;
}
