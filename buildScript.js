const fs = require("fs-extra");
fs.removeSync("./dist_pkg/lib");
fs.copySync("./lib", "./dist_pkg/lib");
