import React from "react";

import { ProfileMenuItem } from "@/apps/launcher/components/ProfileMenuItem";
import type { ProfileCategory } from "@/apps/launcher/types";


export interface CategoryMenuItemProps {
  category: ProfileCategory;
}

export const CategoryMenuItem = function(props: CategoryMenuItemProps){
  const category: ProfileCategory = props.category;
  return (
    <>
      <h3>{category.name}</h3>
      <ul className={category.name}>
      {category.profiles.map((profile, i: number) => {
        return ( <ProfileMenuItem profile={profile} key={`profile-menu-item-${i}`}></ProfileMenuItem> )
      })}
      </ul>
    </>
  )
};