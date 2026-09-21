exports.handler = async (event) => {
  const API_KEY = "d10c7a8b8c1587281d3d6ac770f20d1c";
  const BASE = "https://ee.iva-api.com/api/tvgrid";

  try {
    // Step 1: Get lineup for 28031 OTA
    const lineupResp = await fetch(`${BASE}/lineups?PostalCode=28031&LineupType=OTA&TvMediaApiKey=${API_KEY}`);
    const lineupText = await lineupResp.text();
    let lineupData;
    try { lineupData = JSON.parse(lineupText); }
    catch(e) { return { statusCode:500, headers:{"Access-Control-Allow-Origin":"*"}, body: JSON.stringify({error:"Lineup parse fail", raw:lineupText.slice(0,300)}) }; }

    const lineupId = lineupData?.lineups?.[0]?.lineupID || lineupData?.[0]?.lineupID;
    if (!lineupId) return { statusCode:500, headers:{"Access-Control-Allow-Origin":"*"}, body: JSON.stringify({error:"No lineup", data:lineupData}) };

    // Step 2: Get grid listings
    const now = new Date();
    const base = new Date(now);
    base.setMinutes(now.getMinutes()<30?0:30,0,0);
    const end = new Date(base.getTime()+90*60000);

    const gridResp = await fetch(`${BASE}/lineups/${lineupId}/listings/grid?TvMediaApiKey=${API_KEY}&start=${base.toISOString()}&end=${end.toISOString()}`);
    const gridText = await gridResp.text();
    let gridData;
    try { gridData = JSON.parse(gridText); }
    catch(e) { return { statusCode:500, headers:{"Access-Control-Allow-Origin":"*"}, body: JSON.stringify({error:"Grid parse fail", raw:gridText.slice(0,300)}) }; }

    // Step 3: Build schedule
    const schedule = {
      "1.1":["Channel Guide","Channel Guide","Channel Guide"],
      "1.2":["Welcome Slides","Welcome Slides","Welcome Slides"]
    };

    (gridData?.channels||gridData||[]).forEach(ch => {
      const num = ch.channelNumber || ch.channel?.channelNumber;
      if (!num) return;
      const shows = (ch.airings||ch.listings||[]).slice(0,3).map(a => a.program?.title || a.title || "--");
      while(shows.length<3) shows.push("--");
      schedule[String(num)] = shows;
    });

    return {
      statusCode:200,
      headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=1800"},
      body:JSON.stringify(schedule)
    };

  } catch(e) {
    return { statusCode:500, headers:{"Access-Control-Allow-Origin":"*"}, body: JSON.stringify({error:e.message}) };
  }
};
