"use client";

import type { VideoAsset } from "@/lib/types";
import VideoCard from "@/components/VideoCard";

export default function VideoGrid({
  videos,
  onSeleccionar,
  onBorrarVideo,
}: {
  videos: VideoAsset[];
  onSeleccionar: (video: VideoAsset) => void;
  onBorrarVideo?: (id: string) => void | Promise<void>;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onClick={() => onSeleccionar(video)}
          onBorrar={onBorrarVideo}
        />
      ))}
    </div>
  );
}
