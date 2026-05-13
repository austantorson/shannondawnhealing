// Netlify Function: saves content.json to GitHub repo via GitHub API
// Environment variables required:
//   GITHUB_TOKEN — Personal access token with repo write access
//   GITHUB_REPO  — e.g. "austantorson/shannondawnhealing"

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Check auth — Netlify Identity JWT
  const user = event.headers.authorization;
  if (!user || !user.startsWith("Bearer ")) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO || "austantorson/shannondawnhealing";

  if (!GITHUB_TOKEN) {
    return { statusCode: 500, body: "GitHub token not configured" };
  }

  try {
    const content = JSON.parse(event.body);

    // Get the current file's SHA (required for updating via GitHub API)
    const getRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/content.json`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    let sha = null;
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    // Commit the updated content.json
    const body = {
      message: "Update site content via admin panel",
      content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
      branch: "main",
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/content.json`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.text();
      return { statusCode: putRes.status, body: `GitHub API error: ${err}` };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, message: "Content saved and site will redeploy automatically." }),
    };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};
