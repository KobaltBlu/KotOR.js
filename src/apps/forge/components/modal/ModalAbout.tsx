/**
 * About Forge dialog: project, author, repository, and current game install.
 *
 * @file ModalAbout.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState } from "react";
import { ForgeButton, ForgeDialog } from "@/apps/forge/components/ui";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ModalAboutState } from "@/apps/forge/components/modal/ModalAboutState";
import forgeIcon from "@/assets/icons/icon.png";
import * as KotOR from "@/apps/forge/KotOR";
import "@/apps/forge/components/modal/ModalAbout.scss";

const AUTHOR_NAME = "KobaltBlu";
const AUTHOR_URL = "https://github.com/KobaltBlu";
const REPO_URL = "https://github.com/KobaltBlu/KotOR.js";
const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.txt";

function openProjectUrl(url: string, event: React.MouseEvent<HTMLAnchorElement>) {
  if (typeof window.electron?.openExternal === "function") {
    event.preventDefault();
    window.electron.openExternal(url);
  }
}

export function ModalAbout() {
  const [show, setShow] = useState(false);

  useEffectOnce(() => {
    const onShow = () => setShow(true);
    const onHide = () => setShow(false);
    ModalAboutState.AddEventListener("onShow", onShow);
    ModalAboutState.AddEventListener("onHide", onHide);
    return () => {
      ModalAboutState.RemoveEventListener("onShow", onShow);
      ModalAboutState.RemoveEventListener("onHide", onHide);
    };
  });

  const gameKey = KotOR.ApplicationProfile.GameKey === KotOR.GameEngineType.TSL
    ? "Star Wars: Knights of the Old Republic II"
    : "Star Wars: Knights of the Old Republic";
  const profileKey = KotOR.ApplicationProfile.key || KotOR.ApplicationProfile.profile?.key || "";
  const installPath =
    KotOR.ApplicationProfile.directory ||
    KotOR.ApplicationProfile.directoryHandle?.name ||
    KotOR.ApplicationProfile.profile?.directory ||
    "";
  const version = KotOR.VERSION || process.env.VERSION || "";

  return (
    <ForgeDialog show={show} onHide={() => setShow(false)} className="forge-about-dialog">
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>About KotOR Forge</ForgeDialog.Title>
      </ForgeDialog.Header>
      <ForgeDialog.Body className="forge-about">
        <div className="forge-about__hero">
          <img className="forge-about__logo" src={forgeIcon} alt="" />
          <div className="forge-about__identity">
            <h3 className="forge-about__name">KotOR Forge</h3>
            {version ? <p className="forge-about__version">Version {version}</p> : null}
          </div>
        </div>

        <p className="forge-about__blurb">
          KotOR Forge is the integrated modding suite for <strong>KotOR.js</strong>, a TypeScript
          reimplementation of the Odyssey Game Engine that powered Knights of the Old Republic I
          and II. It provides editors for game resources, a visual module editor, NWScript
          compilation, and project management.
        </p>

        <dl className="forge-about__meta">
          <div className="forge-about__row">
            <dt>Author</dt>
            <dd>
              <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" onClick={(e) => openProjectUrl(AUTHOR_URL, e)}>
                {AUTHOR_NAME}
              </a>
            </dd>
          </div>
          <div className="forge-about__row">
            <dt>Repository</dt>
            <dd>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" onClick={(e) => openProjectUrl(REPO_URL, e)}>
                <span className="fa-brands fa-github" aria-hidden="true" />
                {REPO_URL.replace(/^https:\/\//, "")}
              </a>
            </dd>
          </div>
          <div className="forge-about__row">
            <dt>License</dt>
            <dd>
              <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer" onClick={(e) => openProjectUrl(LICENSE_URL, e)}>
                GPL-3.0
              </a>
            </dd>
          </div>
          <div className="forge-about__row">
            <dt>Game</dt>
            <dd>{gameKey}{profileKey ? ` (${profileKey})` : ""}</dd>
          </div>
          {installPath ? (
            <div className="forge-about__row">
              <dt>Install</dt>
              <dd className="forge-about__path">{installPath}</dd>
            </div>
          ) : null}
        </dl>
      </ForgeDialog.Body>
      <ForgeDialog.Footer>
        <ForgeButton type="button" onClick={() => setShow(false)}>Close</ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
}
