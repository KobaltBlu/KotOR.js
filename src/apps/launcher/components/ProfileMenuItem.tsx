import React from "react";
import { useApp } from "@/apps/launcher/context/AppContext";

export interface ProfileMenuItemProps {
  profile: any;
}

export const ProfileMenuItem = function(props: ProfileMenuItemProps) {
  const profile: any = props.profile;
  const appContext = useApp();
  const [selectedProfileValue, setSelectedProfile] = appContext.selectedProfile;
  const [, setProfilesDrawerOpen] = appContext.profilesDrawerOpen;

  return (
    <li
      className={`launcher-option ${profile.key} ${selectedProfileValue == profile ? 'selected' : ''}`}
      data-sort={profile.sort}
      key={profile.key}
      onClick={(e) => {
        e.preventDefault();
        setSelectedProfile(profile);
        setProfilesDrawerOpen(false);
      }}
    >
      <span className="icon" style={{ backgroundImage: `url(${profile.icon})` }}></span>
      <a
        data-background={profile.background}
        data-icon={profile.icon}
        data-subtitle={profile.full_name || profile.name}
      >
        {profile.name}
      </a>
    </li>
  );
};
