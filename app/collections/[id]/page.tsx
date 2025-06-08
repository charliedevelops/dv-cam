"use client";

import { trpc } from "@/trpc/react";
import { use } from "react";

export default function collectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const {
    data: collections,
    isLoading,
    error,
  } = trpc.CollectionInfo.useQuery({
    collectionId: parseInt(resolvedParams.id),
  });

  if (isLoading) {
    return (
      <div>
        <h1>Collection Page</h1>
        <p>Loading collection information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Collection Page</h1>
        <p>Error loading collection: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Collection Page</h1>
      {collections && collections.success ? (
        <div>
          <h2>{collections.collection.name}</h2>
          <p>{collections.collection.description}</p>
          <p>
            Created At:{" "}
            {new Date(collections.collection.createdAt).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <p>Collection not found</p>
      )}
    </div>
  );
}
