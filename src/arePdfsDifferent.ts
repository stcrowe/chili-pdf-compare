import path from "path";
import { noTry } from "no-try";
import { execFileSync } from "child_process";

export default function (pathSourcePdf: string, pathDiffPdf: string): boolean {
    const exePath =
        (process as any).pkg != null
            ? path.normalize(process.execPath + "/../lib")
            : path.normalize(__dirname + "/../lib");

    // diff-pdf requires absolute paths
    const pathSourcePdfAbs = path.resolve(pathSourcePdf);
    const pathDiffPdfAbs = path.resolve(pathDiffPdf);

    const [execError, execResponse] = noTry(() =>
        execFileSync("diff-pdf.exe", [pathDiffPdfAbs, pathSourcePdfAbs], {
            encoding: "utf8",
            cwd: exePath,
        })
    );

    return execError != null;
}
