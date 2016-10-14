module.exports = {
    entry: "./lib/jebkit.js",
    output: {
        path: __dirname,
        filename: "lib/jebkit.bundle.js"
    },
    module: {
        loaders: []
    }
};