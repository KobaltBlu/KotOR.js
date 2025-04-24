import React from "react";

export const EULA_VERSION = '1.0.0';
export const EULA_DATE = '2025-04-23';

export const EULA = () => {
  return (
    <div className="eula">
      <p>
        <sub><i>Version: {EULA_VERSION}</i></sub><br />
        <sub><i>Last Updated: {EULA_DATE}</i></sub>
      </p>
      <h2>Welcome, KotOR Fan!</h2>
      <p>Thanks for checking out KotOR.js, a community-built, experimental reimplementation of the game engine used in Knights of the Old Republic I & II. Before you dive in, here are a few things you should know:</p>
      
      <h3>⚠️ Important Disclaimers</h3>
      <ul>
        <li><strong>Use at your own risk:</strong> This engine is a work in progress. Expect crashes, bugs, or missing features.</li>
        <li><strong>Backup everything:</strong> Back up your original game files, save data, and mods before using KotOR.js. We’re not responsible for any lost or corrupted data.</li>
        <li><strong>This is not the full game:</strong> You’ll need to legally own the original KotOR games to use your assets with KotOR.js. We don’t distribute any original game content.</li>
        <li><strong>No promises:</strong> We can’t guarantee a smooth or complete experience. This is an evolving passion project.</li>
      </ul>

      <h3>💬 Community and Contributions</h3>
      <p>KotOR.js is open source and thrives on community involvement. If you know how to code—or just have ideas—you’re welcome to help improve it! Report issues, submit pull requests, or just hang out and chat with the devs.</p>
      <p>We’re all here because we love this game. Let’s build something awesome together.</p>

      <h3>✅ By using KotOR.js, you agree that:</h3>
      <ul>
        <li>You understand this is experimental software.</li>
        <li>You won’t blame the developers if something breaks.</li>
        <li>You’re responsible for backing up your own files.</li>
        <li>You’ll play nice with others in the community.</li>
      </ul>

      <p>Thanks again for supporting KotOR.js. May the Force be with you.</p>
      <p>— The KotOR.js Team</p>
    </div>
  );
};
