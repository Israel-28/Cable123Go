exports.handler = async (event) => {
  const API_KEY = "d10c7a8b8c1587281d3d6ac770f20d1c";

  try {
    // First get the lineup ID for zip 28031 OTA
    const lineupResp = await fetch(
      `https://developer.tvmedia.ca/api/v1/lineups?postalCode=28031&country=USA&type=OTA&api_key=${API_KEY}`
    );
    const lineupData = await lineupResp.json();
    const lineupId = lineupData?.lineups?.[0]?.lineupID;

    if (!lineupId) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No lineup found" }),
      };
    }

    // Get current time in Eastern and round to nearest half hour
    const now = new Date();
    const startTime = new Date(now);
    startTime.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0);
    const startISO = startTime.toISOString();

    // Get 1.5 hours of listings
    const listingsResp = await fetch(
      `https://developer.tvmedia.ca/api/v1/lineups/${lineupId}/listings?start=${startISO}&end=${new Date(startTime.getTime() + 90 * 60000).toISOString()}&api_key=${API_KEY}`
    );
    const listingsData = await listingsResp.json();

    // Build our channel map: channelNumber -> [now, next, later]
    const schedule = {
      "1.1": ["Channel Guide", "Channel Guide", "Channel Guide"],
      "1.2": ["Welcome Slides", "Welcome Slides", "Welcome Slides"],
    };

    const channels = listingsData?.listings || [];
    channels.forEach((ch) => {
      const num = ch.channel?.channelNumber;
      if (!num) return;
      const shows = (ch.airings || []).slice(0, 3).map((a) => a.program?.title || "--");
      while (shows.length < 3) shows.push("--");
      schedule[num] = shows;
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800",
      },
      body: JSON.stringify(schedule),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
