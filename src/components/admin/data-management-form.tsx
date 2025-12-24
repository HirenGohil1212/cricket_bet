

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format, subDays } from "date-fns";
import { Calendar as CalendarIcon, Trash2, BrainCircuit } from "lucide-react";
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
import { deleteDataHistory, resetFinancialStats } from "@/app/actions/user.actions";
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
import { Checkbox } from "../ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card";
import { Separator } from "../ui/separator";

const items = [
  { id: "bets", label: "Bets Data" },
  { id: "deposits", label: "Deposits Data (with images)" },
  { id: "withdrawals", label: "Withdrawals Data" },
  { id: "matches", label: "Matches Data" },
] as const;


const dataManagementFormSchema = z.object({
  collectionsToDelete: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
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
    defaultValues: {
      collectionsToDelete: [],
    }
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
      const result = await deleteDataHistory({
        startDate: formData.dateRange.from,
        endDate: formData.dateRange.to,
        collectionsToDelete: formData.collectionsToDelete,
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
  
  const setLast45Days = () => {
    const to = new Date();
    const from = subDays(to, 45);
    form.setValue('dateRange', { from, to }, { shouldValidate: true });
  }

  return (
    <>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Historical Data Deletion</CardTitle>
            <CardDescription>
              Permanently delete historical records within a specific date range. This action is irreversible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="collectionsToDelete"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Data to Delete</FormLabel>
                          <FormDescription>
                            Select the types of data you want to permanently delete.
                          </FormDescription>
                        </div>
                        <div className="space-y-2 rounded-lg border p-4">
                          {items.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="collectionsToDelete"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== item.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                    control={form.control}
                    name="dateRange"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <div className="flex justify-between items-center">
                            <FormLabel>Date Range for Deletion</FormLabel>
                             <Button type="button" variant="outline" size="sm" onClick={setLast45Days}>
                                Select Last 45 Days
                            </Button>
                        </div>
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
                          Select the date range for deleting the selected data types.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" variant="destructive" disabled={isSubmitting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Deleting..." : "Delete Selected Data"}
                  </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <ResetStatsCard />
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action is irreversible. You are about to permanently delete all selected data between <span className="font-bold">{formData?.dateRange.from ? format(formData.dateRange.from, 'PPP') : ''}</span> and <span className="font-bold">{formData?.dateRange.to ? format(formData.dateRange.to, 'PPP') : ''}</span>. This will not delete user accounts.
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

function ResetStatsCard() {
    const { toast } = useToast();
    const [isResetting, setIsResetting] = React.useState(false);
    const [isAlertOpen, setIsAlertOpen] = React.useState(false);
    
    const handleReset = async () => {
        setIsResetting(true);
        const result = await resetFinancialStats();
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            toast({ title: 'Success', description: result.success });
        }
        setIsResetting(false);
        setIsAlertOpen(false);
    };

    return (
        <>
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BrainCircuit className="text-destructive" />
                      Reset Financial Statistics
                    </CardTitle>
                    <CardDescription>
                        This will reset all-time financial summaries like Total Deposits, Total Withdrawals, etc., back to zero.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This action does NOT delete any transaction history (bets, deposits, withdrawals). It only resets the summary counters shown on the dashboard. This is useful if you want to start a new accounting period.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button variant="destructive" onClick={() => setIsAlertOpen(true)} disabled={isResetting}>
                        {isResetting ? "Resetting..." : "Reset All-Time Stats to Zero"}
                    </Button>
                </CardFooter>
            </Card>

             <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will reset all financial counters on your dashboard to zero. This cannot be undone. This is a separate action from deleting historical data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset} className="bg-destructive hover:bg-destructive/90">
                        Confirm & Reset Stats
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
