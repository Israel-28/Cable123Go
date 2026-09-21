exports.handler = async (event) => {
  const API_KEY = "d10c7a8b8c1587281d3d6ac770f20d1c";

  try {
    // Step 1: Get lineup
    const lineupUrl = `https://developer.tvmedia.ca/api/v1/lineups?postalCode=28031&country=USA&type=OTA&api_key=${API_KEY}`;
    const lineupResp = await fetch(lineupUrl);
    const lineupText = await lineupResp.text();

    let lineupData;
    try { lineupData = JSON.parse(lineupText); }
    catch(e) {
      return { statusCode: 500, headers: {"Access-Control-Allow-Origin":"*"}, body: JSON.stringify({error:"Lineup parse fail", raw: lineupText.slice(0,300)}) };
    }

    const lineupId = lineupData?.lineups?.[0]?.lineupID;
    if (!lineupId) {
      return { statusCode: 500, headers: {"Access-Control-Allow-Origin":"*"}, body: JSON.stringify({error:"No lineup", data: lineupData}) };
    }

    // Step 2: Get listings
    const now = new Date();
    const base = new Date(now);
    base.setMinutes(now.getMinutes()<30?0:30,0,0);
    const end = new Date(base.getTime()+90*60000);

    const listUrl = `https://developer.tvmedia.ca/api/v1/lineups/${lineupId}/listings?start=${base.toISOString()}&end=${end.toISOString()}&api_key=${API_KEY}`;
    const listResp = await fetch(listUrl);
    const listText = await listResp.text();

    let listData;
    try { listData = JSON.parse(listText); }
    catch(e) {
      return { statusCode: 500, headers: {"Access-Control-Allow-Origin":"*"}, body: JSON.stringify({error:"Listings parse fail", raw: listText.slice(0,300)}) };
    }

    // Step 3: Build schedule
    const schedule = {
      "1.1": ["Channel Guide","Channel Guide","Channel Guide"],
      "1.2": ["Welcome Slides","Welcome Slides","Welcome Slides"]
    };

    (listData?.listings||[]).forEach(ch => {
      const num = ch.channel?.channelNumber;
      if (!num) return;
      const shows = (ch.airings||[]).slice(0,3).map(a => a.program?.title||"--");
      while(shows.length<3) shows.push("--");
      schedule[num] = shows;
    });

    return {
      statusCode: 200,
      headers: {"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=1800"},
      body: JSON.stringify(schedule)
    };

  } catch(e) {
    return { statusCode: 500, headers: {"Access-Control-Allow-Origin":"*"}, body: JSON.stringify({error: e.message}) };
  }
};
