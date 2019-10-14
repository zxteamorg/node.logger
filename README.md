# ZXTeam's Logger
[![npm version badge](https://img.shields.io/npm/v/@zxteam/logger.svg)](https://www.npmjs.com/package/@zxteam/logger)
[![downloads badge](https://img.shields.io/npm/dm/@zxteam/logger.svg)](https://www.npmjs.org/package/@zxteam/logger)
[![commit activity badge](https://img.shields.io/github/commit-activity/m/zxteamorg/node.logger)](https://github.com/zxteamorg/node.logger/pulse)
[![last commit badge](https://img.shields.io/github/last-commit/zxteamorg/node.logger)](https://github.com/zxteamorg/node.logger/graphs/commit-activity)
[![twitter badge](https://img.shields.io/twitter/follow/zxteamorg?style=social&logo=twitter)](https://twitter.com/zxteamorg)


A logger has 6 different levels of logging:
```
fatal, error, info, debug, trace, warn.
```

### Install
```
npm i @zxteam/logger
```

### Examples (TypeScript)
```typescript
import { Logger } from "@zxteam/contract";
import { logger } from "@zxteam/logger";

const logOn: Logger = logger.getLogger("online");
const logOff: Logger = logger.getLogger("offline");

logOn.info("Message info");    // 23:09:28 INFO online Message info
logOff.error("Message error"); // 23:09:29 ERROR offline Message error
```
