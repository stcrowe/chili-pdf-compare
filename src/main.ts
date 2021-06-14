import { program } from "commander";
import path from "path";
import processProgram from "./processProgram";

program
    .requiredOption("-c --config <value>", "path to config file")
    .option("-o --output <value>", "path to output results")
    .parse();

(async () => {
    const { config, output } = program.opts();
    const outputPath = output != null ? path.normalize(output) : null;
    const configPath = path.normalize(config);

    await processProgram(configPath, outputPath);
})();
