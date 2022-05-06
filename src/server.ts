import express, {Application} from 'express'
import helmet from "helmet";
import path from "path";

const server = () => {
    const app: Application = express()

    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    app.use(helmet());
    app.set('trust proxy', 1);

    return app;
}

export default server;
