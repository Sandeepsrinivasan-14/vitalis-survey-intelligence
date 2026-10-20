'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, FileText, Layers, ListChecks, Sparkles, Target, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataUploader } from '@/components/dashboard/data-uploader';
import { MetricCard } from '@/components/dashboard/metric-card';
import { TrendAnalysis } from '@/components/dashboard/trend-analysis';
import { StatusDonut, TargetBars, TrendIndexChart } from '@/components/dashboard/dashboard-charts';
import { ROLE_DASHBOARDS } from '@/components/dashboard/role-config';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { Stagger, StaggerItem } from '@/components/motion/reveal';
import { useToast } from '@/hooks/use-toast';
import type { ServiceCategory } from '@/data/mock-data';
import type { Role } from '@/lib/auth/roles';
import { summarizeCategories, targetProgress, trendIndex } from '@/lib/dashboard-stats';
import { UPLOAD_PROFILES } from '@/lib/uploads/profiles';
import { transformSheet } from '@/lib/uploads/transform';

const SAMPLE_NAME = 'Sample dataset';

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Processing your file">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-2/3 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="tabular text-2xl font-semibold tracking-tight">{children}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryPanel({ category }: { category: ServiceCategory }) {
  const progress = useMemo(() => targetProgress(category.indicators), [category]);
  const trends = useMemo(() => trendIndex(category.indicators), [category]);
  const hasCharts = progress.length > 0 || trends.series.length > 0;

  return (
    <div className="space-y-4">
      {hasCharts && (
        <div className="grid gap-4 lg:grid-cols-2">
          {progress.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-primary" aria-hidden="true" />
                  Progress to target
                </CardTitle>
                <CardDescription>Latest value against the target for each indicator.</CardDescription>
              </CardHeader>
              <CardContent>
                <TargetBars rows={progress} />
              </CardContent>
            </Card>
          )}
          {trends.series.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trend index</CardTitle>
                <CardDescription>Change since the first period (start = 100), comparable across units.</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendIndexChart data={trends} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{category.name}</CardTitle>
          {category.description && <CardDescription>{category.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {category.indicators.length > 0 ? (
            <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {category.indicators.map((indicator) => (
                <StaggerItem key={indicator.id}>
                  <MetricCard
                    title={indicator.name}
                    value={indicator.value}
                    unit={indicator.unit}
                    description={indicator.description}
                    previousValue={indicator.previousValue}
                    target={indicator.target}
                    status={indicator.status}
                    trend={indicator.trend}
                    trendData={indicator.trendData}
                    lastUpdated={indicator.lastUpdated}
                    actionableNotes={indicator.actionableNotes}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <p className="text-muted-foreground">No indicators for this category.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function RoleDashboard({ role }: { role: Role }) {
  const config = ROLE_DASHBOARDS[role];
  const profile = UPLOAD_PROFILES[role];
  const Icon = config.icon;
  const { toast } = useToast();

  const [data, setData] = useState<ServiceCategory[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('');

  const summary = useMemo(() => (data ? summarizeCategories(data) : null), [data]);

  const handleUploaded = (categories: ServiceCategory[] | null, name?: string) => {
    if (categories && name) {
      setData(categories);
      setFileName(name);
      setActiveTab(categories[0]?.id ?? '');
      if (categories.length === 0) {
        toast({
          title: `No indicators found in ${name}`,
          description: 'The file was read but its columns were not recognised. Download the CSV template for the expected layout.',
        });
      }
    } else if (!categories && name) {
      setData(null);
      setFileName(name);
      setActiveTab('');
    } else {
      setData(null);
      setFileName(null);
      setActiveTab('');
    }
  };

  const loadSample = () => {
    handleUploaded(config.sample, SAMPLE_NAME);
    toast({ title: 'Sample data loaded', description: 'Illustrative figures only. Upload a file to see your own data.' });
  };

  const clear = () => handleUploaded(null);

  const showEmpty = !loading && (!data || data.length === 0);
  const emptyForFile = Boolean(fileName) && (data?.length === 0 || data === null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass gradient-ring flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8"
      >
        <span className="bg-brand-gradient flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-xl shadow-primary/30">
          <Icon className="h-8 w-8" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">{config.title}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{config.description}</p>
        </div>
        <Button asChild variant="outline" className="self-start sm:self-center">
          <Link href="/roles">
            <ArrowLeft aria-hidden="true" />
            Role selection
          </Link>
        </Button>
      </motion.header>

      <DataUploader
        label={config.uploadLabel}
        templateHref={config.templateHref}
        onDataUploaded={handleUploaded}
        onLoadingChange={setLoading}
        transformFileData={(sheet, _type, name) => transformSheet(sheet, name, profile)}
      />

      {loading && <DashboardSkeleton />}

      {showEmpty && (
        <Card className="text-center">
          <CardContent className="flex flex-col items-center gap-4 py-12 sm:py-12">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              {emptyForFile ? <AlertTriangle className="h-7 w-7" aria-hidden="true" /> : <Layers className="h-7 w-7" aria-hidden="true" />}
            </span>
            <div>
              <h2 className="text-xl font-semibold">
                {emptyForFile ? `No displayable data in ${fileName}` : 'No data loaded yet'}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-muted-foreground">
                {emptyForFile
                  ? 'We could not find indicator and value columns in that file. Download the CSV template to see the expected layout.'
                  : config.emptyHint}
              </p>
            </div>
            <Button onClick={loadSample} variant={emptyForFile ? 'outline' : 'default'}>
              <Sparkles aria-hidden="true" />
              Load sample data
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && data && data.length > 0 && summary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">
                Displaying data from: <strong>{fileName}</strong>
              </span>
            </span>
            <Button variant="ghost" size="sm" onClick={clear}>
              <X aria-hidden="true" />
              Clear
            </Button>
          </div>

          <section aria-label="Summary" className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <SummaryStat icon={ListChecks} label="Indicators">
                <AnimatedNumber value={summary.indicators} />
              </SummaryStat>
              <SummaryStat icon={Layers} label="Categories">
                <AnimatedNumber value={summary.categories} />
              </SummaryStat>
              <SummaryStat icon={Target} label="With a target">
                <AnimatedNumber value={summary.withTarget} />
              </SummaryStat>
              <SummaryStat icon={AlertTriangle} label="Need attention">
                <AnimatedNumber value={summary.byStatus.bad} />
              </SummaryStat>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Status overview</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusDonut summary={summary} />
              </CardContent>
            </Card>
          </section>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
              {data.map((category) => (
                <TabsTrigger key={category.id} value={category.id} className="h-auto whitespace-normal px-3 py-2 text-left">
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {data.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-4">
                <CategoryPanel category={category} />
              </TabsContent>
            ))}
          </Tabs>

          <TrendAnalysis metricsData={data} sourceFileName={fileName} />
        </motion.div>
      )}

    </div>
  );
}
