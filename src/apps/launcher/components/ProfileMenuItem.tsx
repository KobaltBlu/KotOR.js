import React from "react";
import { AppProvider, AppProviderValues, useApp } from "../context/AppContext";

export interface ProfileMenuItemProps {
  profile: any
}

export const ProfileMenuItem = function(props: ProfileMenuItemProps){
  const profile: any = props.profile;

  const myContext = useApp();
  const [selectedProfileValue, setSelectedProfile] = myContext.selectedProfile;

  return (
    <li className={`launcher-option ${profile.key} ${selectedProfileValue == profile ? 'selected' : ''}`} data-sort={profile.sort} key={profile.key} onClick={(e) => { e.preventDefault(); setSelectedProfile(profile); }}>
      <span className="icon" style={{'backgroundImage': `url(${profile.icon})`}}></span>
      <a data-background={profile.background} data-icon={profile.icon}>{profile.name}</a>
    </li>
  )
};