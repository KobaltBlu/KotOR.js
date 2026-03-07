import React from "react";
import { ProfileMenuItem } from "./ProfileMenuItem";

export interface CategoryMenuItemProps {
  category: any
}

export const CategoryMenuItem = function(props: CategoryMenuItemProps){
  const category: any = props.category;
  return (
    <>
      <h3>{category.name}</h3>
      <ul className={category.name}>
      {category.profiles.map((profile: any, i: number) => {
        return ( <ProfileMenuItem profile={profile} key={`profile-menu-item-${i}`}></ProfileMenuItem> )
      })}
      </ul>
    </>
  )
};