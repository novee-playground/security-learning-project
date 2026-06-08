const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    const target = process.env.BACKEND_URL || 'http://localhost:3000';
    const paths = ['/api', '/health', '/uploads'];

    console.log(`[setupProxy] proxying ${paths.join(', ')} -> ${target}`);

    app.use(
        paths,
        createProxyMiddleware({
            target,
            changeOrigin: true,
            logLevel: 'warn',
        })
    );
};
