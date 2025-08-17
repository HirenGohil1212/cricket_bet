
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { deleteUserDataHistory } from "@/app/actions/user.actions";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const dataManagementFormSchema = z.object({
  dateRange: z.object({
    from: z.date({
      required_error: "A start date is required.",
    }),
    to: z.date({
      required_error: "An end date is required.",
    }),
  }),
}).refine((data) => data.dateRange.from <= data.dateRange.to, {
    message: "Start date must be before or on the end date.",
    path: ["dateRange"],
});


type DataManagementFormValues = z.infer<typeof dataManagementFormSchema>;

export function DataManagementForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<DataManagementFormValues | null>(null);

  const form = useForm<DataManagementFormValues>({
    resolver: zodResolver(dataManagementFormSchema),
  });

  const onSubmit = (data: DataManagementFormValues) => {
    setFormData(data);
    setIsAlertOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (!formData) return;

    setIsSubmitting(true);
    setIsAlertOpen(false);

    try {
      const result = await deleteUserDataHistory({
        startDate: formData.dateRange.from,
        endDate: formData.dateRange.to,
      });

      if (result.error) {
        toast({ variant: "destructive", title: "Error", description: result.error });
      } else {
        toast({ title: "Success", description: result.success });
        form.reset();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
           <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date range</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value?.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value?.from ? (
                          field.value.to ? (
                            <>
                              {format(field.value.from, "LLL dd, y")} -{" "}
                              {format(field.value.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(field.value.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={{ from: field.value?.from, to: field.value?.to }}
                        onSelect={(range) => field.onChange(range)}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select the date range for deleting user history (bets, deposits, withdrawals).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          <Button type="submit" variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? "Deleting..." : "Delete User Data"}
          </Button>
        </form>
      </Form>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action is irreversible. You are about to permanently delete all user bets, deposits, and withdrawal requests between <span className="font-bold">{formData?.dateRange.from ? format(formData.dateRange.from, 'PPP') : ''}</span> and <span className="font-bold">{formData?.dateRange.to ? format(formData.dateRange.to, 'PPP') : ''}</span>. This will not delete the user accounts themselves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                Confirm & Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
