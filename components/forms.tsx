import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/react";

export default function CollectionForm() {
  const collectionForm = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
  });

  const form = useForm<z.infer<typeof collectionForm>>({
    resolver: zodResolver(collectionForm),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const utils = trpc.useUtils();

  const createCollection = trpc.newCollection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        console.log("Collection created successfully:", data.collection);
        form.reset();
        // Invalidate and refetch the collections query to update the list
        utils.fetchCollections.invalidate();
      } else {
        console.error("Failed to create collection:", data.error);
      }
    },
    onError: (error) => {
      console.error("Error creating collection:", error);
    },
  });

  function onSubmit(values: z.infer<typeof collectionForm>) {
    createCollection.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="charlies collection" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  placeholder="A collection of my favorite things"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This is a short description of your collection.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={createCollection.isPending}>
          {createCollection.isPending ? "Creating..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
}
