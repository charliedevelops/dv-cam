"use client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/trpc/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CollectionForm from "@/components/forms";
import { CaptureProgress } from "@/components/capture-progress";
import { useState } from "react";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function Home() {
  const fetchStatus = trpc.listDevices.useQuery();
  const utils = trpc.useUtils();
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  
  const fetchedCollections = trpc.fetchCollections.useQuery();
  const { data: allJobs } = trpc.getAllJobs.useQuery(undefined, {
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const activeJobs = allJobs?.success ? allJobs.jobs.filter(job => 
    job.status === 'running' || job.status === 'starting'
  ) : [];

  const handleCheckCamera = () => {
    const checkDevicesPromise = utils.listDevices
      .fetch()
      .then((result: any) => {
        if (result.success) {
          return {
            deviceCount: result.devices?.length || 0,
            message: result.message,
            devices: result.devices,
          };
        } else {
          throw new Error(result.error || "Failed to check devices");
        }
      });

    toast.promise(checkDevicesPromise, {
      loading: "Checking for DV cameras...",
      success: (data) => {
        if (data.deviceCount > 0) {
          return `Found ${data.deviceCount} device(s): ${data.devices?.join(
            ", "
          )}`;
        } else {
          return "No DV cameras found - check connection";
        }
      },
      error: (error) => `Error checking cameras: ${error.message}`,
    });
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to DV CAM digitiser
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            {activeJobs.length > 0 && (
              <span className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {activeJobs.length} active capture{activeJobs.length > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="capture">Capture</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="test">tRPC Test</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            {activeJobs.length > 0 && (
              <Card className="mb-6 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    Active Captures ({activeJobs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {activeJobs.map((job) => (
                      <div key={job.id} className="flex justify-between items-center p-2 bg-white rounded border">
                        <div>
                          <span className="font-medium">{job.collectionName}</span>
                          <span className="text-sm text-gray-500 ml-2">({job.status})</span>
                        </div>
                        {job.progress !== undefined && (
                          <span className="text-sm font-medium">{job.progress}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Dialog open={captureDialogOpen} onOpenChange={setCaptureDialogOpen}>
                <DialogTrigger asChild>
                  <Card className="hover:shadow-lg transition-all cursor-pointer group">
                    <CardContent className="p-6">
                      <CardTitle className="text-lg mb-2">
                        Start Recording
                      </CardTitle>
                      <CardDescription>
                        Start recording to an existing or new collection
                      </CardDescription>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Start DV Capture</DialogTitle>
                    <DialogDescription>
                      Select a collection to start capturing DV tapes
                    </DialogDescription>
                  </DialogHeader>
                  
                  {fetchedCollections.data?.success && fetchedCollections.data.collections && fetchedCollections.data.collections.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid gap-2 max-h-32 overflow-y-auto">
                        {fetchedCollections.data.collections.map((collection) => (
                          <Card 
                            key={collection.id} 
                            className={`cursor-pointer transition-all ${
                              selectedCollection?.id === collection.id 
                                ? 'ring-2 ring-blue-500 bg-blue-50' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedCollection(collection)}
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium">{collection.name}</h4>
                                  <p className="text-sm text-gray-500">
                                    {collection.description || "No description"}
                                  </p>
                                </div>
                                {selectedCollection?.id === collection.id && (
                                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      
                      {selectedCollection && (
                        <div className="border-t pt-4">
                          <CaptureProgress
                            collectionId={selectedCollection.id}
                            collectionName={selectedCollection.name}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No collections found. Create a collection first.</p>
                      <Button onClick={() => setCaptureDialogOpen(false)}>
                        Close and Create Collection
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Card className="hover:shadow-lg transition-all cursor-pointer group">
                    <CardContent className="p-6">
                      <CardTitle className="text-lg mb-2">
                        Create Collection
                      </CardTitle>
                      <CardDescription>
                        Organize dv clips into collections
                      </CardDescription>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create new collection</DialogTitle>
                    <DialogDescription>
                      Create a new collection (folder) to organise dv tapes
                    </DialogDescription>
                  </DialogHeader>
                  <CollectionForm />
                </DialogContent>
              </Dialog>

              <Card
                className="hover:shadow-lg transition-all cursor-pointer group"
                onClick={handleCheckCamera}
              >
                <CardContent className="p-6">
                  <CardTitle className="text-lg mb-2">Check Camera</CardTitle>
                  <CardDescription>
                    Test dv cam is being recognised
                  </CardDescription>
                </CardContent>
              </Card>
              <div className="md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Collections</CardTitle>
                    <CardDescription>
                      Quick access to your latest collections
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {fetchedCollections.data?.success && fetchedCollections.data.collections && fetchedCollections.data.collections.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {fetchedCollections.data.collections.slice(0, 6).map((collection: Collection) => (
                          <Card 
                            key={collection.id}
                            className="cursor-pointer hover:shadow-md transition-all"
                            onClick={() => {
                              setSelectedCollection(collection);
                              setCaptureDialogOpen(true);
                            }}
                          >
                            <CardContent className="p-4">
                              <h4 className="font-medium text-sm mb-1">{collection.name}</h4>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {collection.description || "No description"}
                              </p>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-gray-400">
                                  Click to record
                                </span>
                                <Button size="sm" variant="ghost">
                                  Start
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-center py-4">
                        No collections found. Create one to get started.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="capture" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">DV Capture Manager</h2>
                <p className="text-gray-600">Start and monitor DV tape captures for your collections</p>
              </div>
              
              {fetchedCollections.data?.success && fetchedCollections.data.collections && fetchedCollections.data.collections.length > 0 ? (
                <div className="grid gap-6">
                  {fetchedCollections.data.collections.map((collection) => (
                    <CaptureProgress
                      key={collection.id}
                      collectionId={collection.id}
                      collectionName={collection.name}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Collections Found</CardTitle>
                    <CardDescription>
                      Create a collection first before starting captures.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>Create Your First Collection</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create new collection</DialogTitle>
                          <DialogDescription>
                            Create a new collection (folder) to organise dv tapes
                          </DialogDescription>
                        </DialogHeader>
                        <CollectionForm />
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">Tape Gallery</h3>
              <p className="text-gray-600 mb-4">
                View and manage your captured photos and videos.
              </p>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {fetchedCollections.data?.success &&
                  fetchedCollections.data?.collections?.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <span className="text-gray-500 text-sm">
                        {item.name || item.id}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Video Quality
                  </label>
                  <select className="w-full p-2 border rounded-md">
                    <option>1080p HD</option>
                    <option>720p</option>
                    <option>4K</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Audio Recording
                  </label>
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span>Enable audio recording</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Auto-save
                  </label>
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span>Automatically save recordings</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">About DVCAM</h3>
              <div className="space-y-4">
                <p className="text-gray-600">
                  DVCAM is a modern digital video camera application built with
                  Next.js and React.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Version:</strong> 1.0.0
                  </div>
                  <div>
                    <strong>Built with:</strong> Next.js
                  </div>
                  <div>
                    <strong>UI:</strong> shadcn/ui
                  </div>
                  <div>
                    <strong>Styling:</strong> Tailwind CSS
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="test" className="mt-6"></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
