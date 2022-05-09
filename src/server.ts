import express, {Application} from 'express'
import helmet from "helmet";
import path from "path";
import {oidcProvider} from "./dependencies";
import flowRouter from "./routes";
import testRouter from "./test-flow";

const server = () => {
    const app: Application = express()

    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    app.use(helmet());
    app.set('trust proxy', 1);

    // !!!!!!!!!!!! DEV ONLY !!!!!!!!!!!!!
    app.use(testRouter);
    // !!!!!!!!!!!! DEV ONLY !!!!!!!!!!!!!

    app.use(flowRouter)
    app.use('/', oidcProvider.callback());

    return app;
}

export default server;
