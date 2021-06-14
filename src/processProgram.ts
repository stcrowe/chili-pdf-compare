import path from "path";
import { noTry, noTryAsync } from "no-try";
import getConfigAsJson from "./getConfigAsJson";
import chalk from "chalk";
import fs from "fs-extra";
import getDirectoryPdfs from "./getDirectoryPdfs";
import ProgressBar from "progress";
import getArePdfsDifferent from "./arePdfsDifferent";
import ora from "ora";
import { json2csvAsync } from "json-2-csv";
import getChiliPdfs from "./getChiliPdfs";

export default async function (configPath: string, outputPath: string | null) {
    const [diffConfigError, diffConfig] = noTry(() =>
        getConfigAsJson(configPath)
    );

    console.log("");

    if (diffConfigError != null) {
        console.log(diffConfigError);
        return;
    }

    if (outputPath == null || !fs.existsSync(outputPath)) {
        outputPath =
            (process as any).pkg != null
                ? path.normalize(process.execPath + "/../")
                : path.normalize(__dirname + "/../");
    } else {
        const outputPathStat = fs.statSync(outputPath);

        if (!outputPathStat.isDirectory()) {
            outputPath =
                (process as any).pkg != null
                    ? path.normalize(process.execPath + "/../")
                    : path.normalize(__dirname + "/../");
        }
    }

    if (diffConfig.server != null) {
        const spinner = ora("Downloading PDFs").start();
        await getChiliPdfs(diffConfig);
        spinner.stop();
    }

    const sourcePdfPaths = getDirectoryPdfs(diffConfig.sourcePath);
    const diffPdfPaths = getDirectoryPdfs(diffConfig.comparePath);

    const progressBar = new ProgressBar("Comparing PDFs [:bar] :percent", {
        total: diffPdfPaths.length,
    });

    const results: { different: boolean | "missing"; path: string }[] = [];

    for (const diffPdfPath of diffPdfPaths) {
        progressBar.tick();

        const sourceIndex = sourcePdfPaths.findIndex(
            (p) => path.basename(p) == path.basename(diffPdfPath)
        );

        if (sourceIndex < 0) {
            results.push({
                different: "missing",
                path: diffPdfPath,
            });
            continue;
        }

        const different = getArePdfsDifferent(
            diffPdfPath,
            sourcePdfPaths[sourceIndex]
        );

        results.push({
            different: different,
            path: diffPdfPath,
        });
    }

    console.log("\n");
    const spinner = ora("Writing Results").start();

    const [errorCsv, csv] = await noTryAsync<string>(
        async () => await json2csvAsync(results)
    );

    spinner.stop();

    if (errorCsv != null) {
        console.log(chalk.red("csv error"));
        console.log(errorCsv);
        return;
    }

    const resultsPath = path.normalize(outputPath + "/results.csv");

    fs.writeFileSync(resultsPath, csv, { encoding: "utf8" });

    console.log(chalk.green("👍 finished"));
    console.log("results can be found at: " + resultsPath);
}
