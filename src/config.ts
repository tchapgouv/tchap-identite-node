const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const appUrl: string = process.env.APP_URL ? process.env.APP_URL.replace(/\/+$/, '') : `http://localhost:${port}`;

export {
    port, appUrl
}
