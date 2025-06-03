import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to DV CAM digitiser
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto"></p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <CardTitle className="text-lg mb-2">
                    Start Recording
                  </CardTitle>
                  <CardDescription>
                    start recording to an exisiting or new collection
                  </CardDescription>
                </CardContent>
              </Card>

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

              <Card className="hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <CardTitle className="text-lg mb-2">Check Camera</CardTitle>
                  <CardDescription>
                    Test dv cam is being recognised
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">Media Gallery</h3>
              <p className="text-gray-600 mb-4">
                View and manage your captured photos and videos.
              </p>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(
                  (item) => (
                    <div
                      key={item}
                      className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <span className="text-gray-500 text-sm">
                        Media {item}
                      </span>
                    </div>
                  )
                )}
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
        </Tabs>
      </main>
    </div>
  );
}
