import bodyParser from "body-parser";
import {RequestHandler, Router} from "express";
import {
    abortInteractionController,
    endInteractionController,
    loginInteractionController,
    startInteractionController
} from "./authControllers";

const parse = bodyParser.urlencoded({extended: false});

const setNoCache: RequestHandler = (req, res, next) => {
    res.set('Pragma', 'no-cache');
    res.set('Cache-Control', 'no-cache, no-store');
    next();
}

const flowRouter = Router();
flowRouter.get('/interaction/:uid', setNoCache, startInteractionController);
flowRouter.post('/interaction/:uid/login', setNoCache, parse, loginInteractionController);
flowRouter.post('/interaction/:uid/confirm', setNoCache, parse, endInteractionController);
flowRouter.get('/interaction/:uid/abort', setNoCache, abortInteractionController);

export {
    flowRouter
};
