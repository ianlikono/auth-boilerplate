require('dotenv-safe').config();
import { ApolloServer } from "apollo-server-express";
import connectRedis from 'connect-redis';
import cors from 'cors';
import Express from "express";
import session from 'express-session';
import passport from 'passport';
import { Strategy as Auth0Strategy } from 'passport-auth0';
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { User } from "./entity/User";
import { MeResolver } from "./modules/user/Me";
import { redis } from "./redis";



const main = async () => {
    await createConnection();

    const schema = await buildSchema({
        resolvers: [MeResolver],
        authChecker: ({ context: { req } }) => {
            return !!req.session.userId
        }
    });

    const apolloServer = new ApolloServer({
        schema,
        context: ({ req }: any) => ({ req })
    });

    const app = Express();

    const RedisStore = connectRedis(session);

    app.use(cors({
        credentials: true,
        origin: "http://localhost:3000"
    }));

    app.use(
        session({
            store: new RedisStore({
                client: redis as any,
            }),
            name: "qid",
            secret: "bsdbsdhsd888shjs8",
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 1000 * 60 * 60 * 24 * 7 * 30, // 7 months
            },
        })
    );

    const strategy = new Auth0Strategy({
        domain: process.env.AUTH0_DOMAIN!,
        clientID: process.env.AUTH0_CLIENT_ID!,
        clientSecret: process.env.AUTH0_CLIENT_SECRET!,
        callbackURL: 'http://localhost:4000/callback'
    },
        async (accessToken, refreshToken, _extraParams, profile: any, cb) => {
            console.log("JSON", profile._json);
            let user = await User.findOne({ where: { email: profile._json.email } })
            if (!user) {
                user = await User.create({
                    username: profile._json.name,
                    email: profile._json.email,
                    sub: profile._json.sub,
                    pictureUrl: profile._json.picture,
                    email_verified: profile._json.email_verified
                }).save();
            } else {
                cb(null, {
                    user,
                    accessToken,
                    refreshToken
                })
            }
            return cb(null, profile);
        }
    );

    passport.use(strategy);

    app.use(passport.initialize())

    app.get('/callback',
        passport.authenticate('auth0', { failureRedirect: '/login' }),
        (req: any, res) => {
            if (!req.user) {
                throw new Error('user null');
            }
            console.log(req.user)
            req.session.userId = req.user.user.id;
            req.session.accessToken = req.user.accessToken;
            req.session.refreshToken = req.user.refreshToken;
            res.redirect("http://localhost:3000/");
        }
    );

    app.get('/login',
        passport.authenticate('auth0', { session: false }), function (_req, res) {
            res.redirect("/");
        });


    apolloServer.applyMiddleware({ app });

    app.listen(4000, () => {
        console.log("server started on http://localhost:4000/graphql");
    });
};

main();