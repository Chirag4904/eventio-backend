import { Router } from "express";

const router = Router();

import {toNodeHandler} from "better-auth/node";
import {auth} from "../utils/auth.ts";


router.all("/{*any}", toNodeHandler(auth));

export default router;