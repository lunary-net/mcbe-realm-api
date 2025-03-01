const express = require('express');
const { Authflow, Titles } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axl = require('app-xbox-live');
const { ping } = require('bedrock-protocol');
const { port, databasePath } = require('./settings.json');
const protocolVersions = require('./protocol.json')

const app = express();

let realms = [];

// Load realms from a JSON file
const loadRealmsFromFile = (databasePath) => {
  if (fs.existsSync(databasePath)) {
    const fileContent = fs.readFileSync(databasePath, 'utf8');
    realms = fileContent ? JSON.parse(fileContent) : [];
  } else {
    console.error(`File not found: ${databasePath}`);
  }
};

loadRealmsFromFile(databasePath);

app.get('/api/realms/', async (req, res) => {
  res.json({
    realmsapi: {
      documentation: {
        "GET /api/realms/": "Returns documentation for the API.",
        "GET /api/realms/:realmCode": "Fetches information for a specified realm using its realm code.",
      },
      endpoints: {
        "GET /api/realms/": "Provides a summary of available API documentation.",
        "GET /api/realms/:realmCode": "Retrieves detailed information about a specific realm identified by its realm code.",
      },
      schemas: {
        "Realm": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "ip": { "type": "string" },
            "port": { "type": "integer" },
            "remoteSubscriptionId": { "type": "string" },
            "ownerUUID": { "type": "string" },
            "name": { "type": "string" },
            "motd": { "type": "string" },
            "defaultPermission": { "type": "string" },
            "state": { "type": "string" },
            "daysLeft": { "type": "integer" },
            "expired": { "type": "boolean" },
            "expiredTrial": { "type": "boolean" },
            "gracePeriod": { "type": "boolean" },
            "worldType": { "type": "string" },
            "maxPlayers": { "type": "integer" },
            "clubId": { "type": "string" },
            "member": { "type": "array", "items": { "type": "string" } },
            "invite": {
              "type": "object",
              "properties": {
                "code": { "type": "string" },
                "ownerxuid": { "type": "string" },
                "codeurl": { "type": "string" }
              }
            },
            "server": {
              "type": "object",
              "properties": {
                "motd": { "type": "string" },
                "levelName": { "type": "string" },
                "playersOnline": { "type": "integer" },
                "maxPlayers": { "type": "integer" },
                "gamemode": { "type": "string" },
                "gamemodeId": { "type": "integer" },
                "version": { "type": "string" },
                "protocol": { "type": "integer" }
              }
            },
            "gracePeriod": { "type": "boolean", "default": false },
            "thumbnailId": { "type": "string", "default": null },
            "minigameName": { "type": "string", "default": null },
            "minigameId": { "type": "string", "default": null },
            "minigameImage": { "type": "string", "default": null },
            "owner": {
              "type": "object",
              "properties": {
                "xuid": { "type": "string" },
                "displayName": { "type": "string" },
                "gamertag": { "type": "string" },
                "gamerScore": { "type": "integer" },
                "presenceState": { "type": "string" },
                "presenceText": { "type": "string" }
              }
            },
            "club": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "tags": { "type": "array", "items": { "type": "string" } },
                "preferredColor": { "type": "string" },
                "membersCount": { "type": "integer" },
                "followersCount": { "type": "integer" },
                "reportCount": { "type": "integer" },
                "reportedItemsCount": { "type": "integer" }
              }
            },
          }
        }
      }
    }
  });
});

app.get('/api/realms/:realmCode', async (req, res) => {
  const realmCode = req.params.realmCode;
  const realmInfo = await getRealmInfo(realmCode);
  res.json(realmInfo);
});

async function getRealmInfo(realmCode) {
  const authflow = new Authflow(undefined, "./auth", { 
    flow: "live", 
    authTitle: Titles.MinecraftNintendoSwitch, 
    deviceType: "Nintendo", 
    doSisuAuth: true 
  });
  const info = await authflow.getXboxToken(); 
  const api = RealmAPI.from(authflow, 'bedrock');

  try {
    const filePath = './data/client/database.json';
    let dumpedData = realms;

    if (realmCode.length === 8) {
      const realminfoid = {
        id: realmCode,
        name: realmCode,
      };
      return realminfoid;
    }
    const realm = await api.getRealmFromInvite(realmCode);

    let host = null;
    let port = null;
    let server = { invalid: true };

    if (realm.state !== "CLOSED") { 
      ({ host, port } = await realm.getAddress());
      server = await ping({ host, port });
    }
    
    // Map the protocol to the correct version
    let protocolVersion = server.protocol;
    const protocolMapping = protocolVersions.find(pv => pv.version === server.protocol);
    if (protocolMapping) {
      protocolVersion = protocolMapping.minecraftVersion;
    }

    const xl = new axl.Account(`XBL3.0 x=${info.userHash};${info.XSTSToken}`);
    const owner = await xl.people.get(realm.ownerUUID);
    const club = await xl.club.get(realm.clubId);
    const clubInfo = club.clubs[0];
    const ownerInfo = owner.people[0] || {};

    const ownerDetails = {
      xuid: ownerInfo.xuid || "Unknown",
      displayName: ownerInfo.displayName || "Unknown",
      gamertag: ownerInfo.gamertag || "Unknown",
      gamerScore: ownerInfo.gamerScore || "Unknown",
      presenceState: ownerInfo.presenceState || "Unknown",
      presenceText: ownerInfo.presenceText || "Unknown",
    };

    const clubDetail = {
      id: clubInfo.id,
      tags: clubInfo.tags,
      preferredColor: clubInfo.preferredColor,
      membersCount: clubInfo.membersCount,
      followersCount: clubInfo.followersCount,
      reportCount: clubInfo.reportCount,
      reportedItemsCount: clubInfo.reportedItemsCount
    };

    const realminfo = {
      id: realm.id,
      ip: host,
      port: port,
      remoteSubscriptionId: realm.remoteSubscriptionId || null,
      subscriptionRefreshStatus: realm.subscriptionRefreshStatus !== undefined && realm.subscriptionRefreshStatus !== null ? realm.subscriptionRefreshStatus : null,
      ownerUUID: realm.ownerUUID,
      name: realm.name,
      motd: realm.motd,
      defaultPermission: realm.defaultPermission,
      state: realm.state,
      daysLeft: realm.daysLeft,
      expired: realm.expired,
      expiredTrial: realm.expiredTrial,
      gracePeriod: realm.gracePeriod,
      worldType: realm.worldType,
      maxPlayers: realm.maxPlayers,
      clubId: realm.clubId,
      member: realm.member,
      invite: {
        code: realmCode,
        ownerxuid: realm.ownerUUID,
        codeurl: "https://realms.gg/" + realmCode,
      },
      server: {
        motd: server.motd,
        levelName: server.levelName,
        playersOnline: server.playersOnline,
        maxPlayers: server.playersMax,
        gamemode: server.gamemode ?? "Unknown",
        gamemodeId: server.gamemodeId,
        version: server.version,
        protocol: protocolVersion
      },
      thumbnailId: realm.thumbnailId || null,
      minigameName: realm.minigameName || null,
      minigameId: realm.minigameId || null,
      minigameImage: realm.minigameImage || null,
      owner: ownerDetails,
      club: clubDetail,
    };

    dumpedData.push(realminfo);
    await fs.writeFileSync(filePath, JSON.stringify(dumpedData, null, 2));

    return realminfo;
  } catch (error) {
    console.error("Realm not found", error);
    return { name: false, realmCode, valid: false, error: `${error}` };
  }
}

// Custom error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error_code: 500, message: "There was error on server-side (If you are admin check terminal to see)", request_id: uuidv4()});
});

// Handle 404 - Page Not Found
app.use((req, res) => {
  res.status(404).json({ error_code: 404, message: "Page Not Found", request_id: uuidv4()});
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
