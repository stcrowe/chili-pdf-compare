import fs from "fs";
import path from "path";

export default function (directoryPath: string): string[] {
    const directoryItems = fs.readdirSync(directoryPath);

    const pdfs = [];

    for (const directoryItem of directoryItems.map(
        (p) => (p = path.normalize(directoryPath + "/" + p))
    )) {
        const directoryStat = fs.statSync(directoryItem);

        if (!directoryStat.isFile()) {
            continue;
        }

        if (path.extname(directoryItem).toLowerCase() == ".pdf") {
            pdfs.push(directoryItem);
        }
    }

    return pdfs;
}
