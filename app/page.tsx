"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

export default function Home() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const utils = trpc.useUtils();
  const { mutate: createCollection } = trpc.newCollection.useMutation({
    onSuccess: () => {
      utils.fetchCollections.invalidate();
    },
  });

  function newCollection(name: string, description: string) {
    createCollection({ name, description });
  }

  const { data: collections, isLoading: isLoadingCollections } =
    trpc.fetchCollections.useQuery();

  const { data: cameraStatus, isLoading: isLoadingCameraStatus } =
    trpc.checkStatus.useQuery();

  function handleCameraStatus() {
    if (cameraStatus?.success) {
      toast.success("Camera is connected and ready to use!");
    } else {
      toast.error("Camera is not connected or not ready.");
    }
  }

  const { mutate: startJob } = trpc.jobRouter.start.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Job started successfully: ${data.message}`);
        setSelectedCollectionId("");
        utils.jobRouter.getStatus.invalidate();
      } else {
        toast.error(`Failed to start job: ${data.message}`);
      }
    },
    onError: (error) => {
      toast.error(`Error starting job: ${error.message}`);
    },
  });

  const handleStartCapture = () => {
    if (!selectedCollectionId) {
      toast.error("Please select a collection first");
      return;
    }

    const collectionId = parseInt(selectedCollectionId);
    if (isNaN(collectionId)) {
      toast.error("Invalid collection selected");
      return;
    }

    startJob({ collectionId });
  };

  const { data: fetchedJobs, isLoading: isLoadingJobs } =
    trpc.jobRouter.getStatus.useQuery();

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to DV CAM digitiser
          </h1>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">Dashboard</h3>
              <div className="mb-6 flex flex-row items-center justify-between">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="default" size="lg">
                      + New Collection
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold mb-1">
                        Create New Collection
                      </DialogTitle>
                      <DialogDescription className="mb-4 text-gray-500">
                        Enter a name and description for your new collection.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      className="space-y-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const name = (
                          form.elements.namedItem("name") as HTMLInputElement
                        ).value;
                        const description = (
                          form.elements.namedItem(
                            "description"
                          ) as HTMLInputElement
                        ).value;
                        newCollection(name, description);
                      }}
                    >
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium mb-1"
                        >
                          Name
                        </label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Collection Name"
                          className="w-full"
                          required
                          autoFocus
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="description"
                          className="block text-sm font-medium mb-1"
                        >
                          Description
                        </label>
                        <Input
                          id="description"
                          name="description"
                          placeholder="Collection Description"
                          className="w-full"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <DialogTrigger asChild>
                          <Button variant="outline" type="button">
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <Button type="submit" variant="default">
                          Create
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button onClick={() => handleCameraStatus()}>
                  Check Camera Status
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="default" size="lg">
                      Capture new tape
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold mb-1">
                        Capture a new tape
                      </DialogTitle>
                      <DialogDescription className="mb-4 text-gray-500">
                        Choose a collection for your tape to be saved
                      </DialogDescription>
                    </DialogHeader>
                    <Select
                      value={selectedCollectionId}
                      onValueChange={setSelectedCollectionId}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Collection" />
                      </SelectTrigger>
                      <SelectContent>
                        {collections?.success &&
                          collections.collections?.map((collection) => (
                            <SelectItem
                              key={collection.id}
                              value={collection.id.toString()}
                            >
                              {collection.name}
                            </SelectItem>
                          ))}
                        {collections?.success &&
                          collections.collections?.length === 0 && (
                            <SelectItem value="none" disabled>
                              No collections available
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleStartCapture}
                      disabled={
                        !selectedCollectionId || selectedCollectionId === "none"
                      }
                    >
                      Start Capture
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
              <div>
                <h1 className="text-2xl">Recently added Collections</h1>

                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {collections?.success &&
                    collections.collections?.length === 0 && (
                      <div className="col-span-full text-center text-gray-400 py-12">
                        <span className="text-2xl">No collections yet.</span>
                        <div className="mt-2 text-sm">
                          Create your first collection above!
                        </div>
                      </div>
                    )}
                  {collections?.success &&
                    collections.collections?.map((collection) => (
                      <Card
                        key={collection.id}
                        className="flex flex-col justify-between shadow-sm border border-gray-100 rounded-2xl bg-gradient-to-br from-white via-gray-50 to-gray-100 hover:shadow-lg transition-all duration-200"
                      >
                        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                          <span className="text-lg font-semibold text-gray-900 truncate max-w-[70%]">
                            {collection.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            #{collection.id}
                          </span>
                        </CardHeader>
                        <CardDescription className="px-5 pb-5 pt-2 text-gray-600 min-h-[48px]">
                          {collection.description}
                        </CardDescription>
                      </Card>
                    ))}
                </div>
              </div>
              <div>
                <h1 className="text-2xl">ongoing jobs:</h1>
                <div>
                  {fetchedJobs?.hasJobs && fetchedJobs.jobs.length > 0 ? (
                    fetchedJobs.jobs.map((job) => (
                      <Card key={job.jobId} className="mt-4">
                        <CardHeader>{job.status}</CardHeader>
                        {job.status === "failed" && (
                          <CardContent>
                            {job.logs.map(
                              (log: {
                                id: string | number;
                                createdAt: string | number | Date;
                                level: string;
                                message: string;
                              }) => (
                                <div key={log.id} className="mb-2">
                                  <span className="text-sm text-gray-500">
                                    [
                                    {new Date(
                                      log.createdAt
                                    ).toLocaleTimeString()}
                                    ]{" "}
                                    <span className="font-semibold">
                                      {log.level}:
                                    </span>
                                    {log.message}
                                  </span>
                                </div>
                              )
                            )}
                          </CardContent>
                        )}
                        {job.status === "running" && (
                          <CardContent>
                            <div className="text-sm text-gray-500">
                              Progress: {job.progress}%
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              Collection: {job.collectionName}
                            </div>
                            <Accordion type="single" collapsible>
                              <AccordionItem value="item-1">
                                <AccordionTrigger>See logs</AccordionTrigger>
                                <AccordionContent>
                                  {job.logs.map((log) => (
                                    <div
                                      key={log.id}
                                      className="mb-2 text-sm text-gray-500"
                                    >
                                      [
                                      {new Date(
                                        log.createdAt
                                      ).toLocaleTimeString()}
                                      ]{" "}
                                      <span className="font-semibold">
                                        {log.level}:
                                      </span>{" "}
                                      {log.message}
                                    </div>
                                  ))}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </CardContent>
                        )}
                        {(job.status === "completed" ||
                          job.status === "cancelled") && (
                          <CardContent>
                            <div className="text-sm text-gray-500">
                              Status: {job.status}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              Collection: {job.collectionName}
                            </div>
                            <div className="text-xs text-gray-400">
                              Completed:{" "}
                              {new Date(job.updatedAt).toLocaleString()}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))
                  ) : (
                    <div className="mt-4 text-gray-500">No jobs found.</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="capture" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">Capture</h3>
              <p className="text-gray-600">Capture content goes here.</p>
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">Gallery</h3>
              <p className="text-gray-600">Gallery content goes here.</p>
              <div>
                {collections?.success &&
                  collections.collections?.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                      <span className="text-2xl">No collections yet.</span>
                      <div className="mt-2 text-sm">
                        Create your first collection in the Dashboard tab!
                      </div>
                    </div>
                  )}
                {collections?.success && (
                  <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {collections.collections?.map((collection) => (
                      <Link
                        key={collection.id}
                        href={`/collections/${collection.id}`}
                      >
                        <Card
                          key={collection.id}
                          className="flex items-center justify-center aspect-square shadow-sm border border-gray-100 rounded-xl bg-gradient-to-br from-white via-gray-50 to-gray-100 hover:shadow-lg transition-all duration-200 p-2"
                        >
                          <span className="text-base font-medium text-gray-900 text-center px-2 w-full truncate">
                            {collection.name}
                          </span>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">Settings</h3>
              <p className="text-gray-600">Settings content goes here.</p>
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">About</h3>
              <p className="text-gray-600">About content goes here.</p>
            </div>
          </TabsContent>

          <TabsContent value="test" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">Test</h3>
              <p className="text-gray-600">Test content goes here.</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
