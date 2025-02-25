const express = require('express');
const { port } = require('./settings.json');
const { Authflow, Titles } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const fs = require('fs');
const axl = require('app-xbox-live')
const { ping } = require('bedrock-protocol');

const app = express();

let realms = [];

// Load realms from a JSON file
const loadRealmsFromFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    realms = fileContent ? JSON.parse(fileContent) : [];
  } else {
    console.error(`File not found: ${filePath}`);
  }
};

loadRealmsFromFile('./data/client/database.json');

// Your existing routes and middleware here
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
      remoteSubscriptionId: realm.remoteSubscriptionId,
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
        gamemode: server.gamemode ?? "unknown",
        gamemodeId: server.gamemodeId,
        version: server.version,
        protocol: server.protocol
      },
      owner: ownerDetails,
      club: clubDetail
    };

    dumpedData.push(realminfo);
    await fs.writeFileSync(filePath, JSON.stringify(dumpedData, null, 2));

    return realminfo;
  } catch (error) {
    console.error("Error in getRealmInfo:", error);
    return { name: false, realmCode, valid: false };
  }
}

// Custom error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Handle 404 - Page Not Found
app.use((req, res) => {
  res.status(404).send('Page not found');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
