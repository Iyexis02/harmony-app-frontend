import React from 'react';

import { UserTopTracks } from '@/types';

type TopTracksProps = {
  mostListenedTracks: UserTopTracks;
};

const TopTracks = ({ mostListenedTracks }: TopTracksProps) => {
  console.log('mostListenedTracks', mostListenedTracks.items);
  return (
    <>
      <div>
        {mostListenedTracks?.items?.map((item) => {
          return (
            <div className="flex flex-row gap-4">
              <div className="w-1/3">
                <p className="mr-40"> {item.name} </p>
              </div>
              <div className="w-1/3">
                <p className="flex justify-start">{item.id}</p>
              </div>
              <div className="w-1/3">
                <p className="flex justify-start">{(item.duration_ms / 1000 / 60).toFixed(2)}m</p>
              </div>
            </div>
          );
        })}
      </div>
      <a href="/profile" className="mt-9">
        {' '}
        back to profile{' '}
      </a>
    </>
  );
};

export default TopTracks;
