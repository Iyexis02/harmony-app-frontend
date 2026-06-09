'use client';

import { SpotifyProfileResult, SpotifyUserProfile } from '@/types';

type UserProfileProps = {
  userProfile?: SpotifyProfileResult;
};

const UserProfile = ({ userProfile }: UserProfileProps) => {
  console.log('userProfile', userProfile);
  if (!userProfile?.ok)
    return (
      <>
        <a href="/"> back </a>
        <p>"Not logged in"</p>
      </>
    );

  return (
    userProfile && (
      <div>
        <p> Country: {userProfile?.profile?.country} </p>
        <p> DisplayName: {userProfile?.profile?.display_name} </p>
        <p> Email {userProfile?.profile?.email} </p>
        {userProfile?.profile?.images?.map((image, key) => {
          return <img key={key} src={image.url} height={image.height ?? 50} width={image.width ?? 50} />;
        })}
        <p>SpotifyId: {userProfile?.profile?.id}</p>
        <p>URI: {userProfile?.profile?.uri} </p>
        <p>filter enabled {String(userProfile.profile?.explicit_content?.filter_enabled)} </p>
        <p>filter locked {String(userProfile.profile?.explicit_content?.filter_locked)} </p>
        <p>external spotify url {userProfile.profile?.external_urls?.spotify} </p>
        <p> follower list {userProfile.profile?.followers?.href} </p>
        <p> follower count {userProfile.profile?.followers?.total} </p>
        <p className="mb-2"> Subsription {userProfile?.profile?.product} </p>
        <div className="flex gap-4">
          <a href="/"> back </a>
          <a href="/profile/top-tracks"> tracks </a>
          <a href="/profile/top-artists"> artists </a>
        </div>
      </div>
    )
  );
};

export default UserProfile;
