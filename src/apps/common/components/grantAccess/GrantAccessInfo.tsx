import React from "react";

export const GrantAccessInfo = () => {
  return (
    <div className="grant-access-info">
      <p>Please grant this application access to your game install directory to continue.</p>
      <p>
        In supported browsers, this uses the File System Access API to request permission to the folder you select.
        This is important because the app must read game resources and write updated files directly in your install directory.
        {" "}
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API" target="_blank" rel="noreferrer noopener">
          Learn more about the File System Access API
        </a>
        .
      </p>
    </div>
  );
};

export default GrantAccessInfo;
