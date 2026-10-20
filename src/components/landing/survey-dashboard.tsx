'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Database, Filter, Hospital, Map, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal';
import { CoverageSection } from '@/components/landing/coverage-section';
import { DistrictGenderBars, GenderDonut, genderChartConfig } from '@/components/landing/survey-charts';
import {
  hwcDistrictMockData,
  hwcPhcMockData,
  hwcSummaryMockData,
  type HwcDistrictData,
  type HwcGenderCounts,
} from '@/data/mock-data';

interface KpiProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

function Kpi({ title, icon: Icon, children }: KpiProps) {
  return (
    <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <CardContent className="flex items-start justify-between gap-3 p-5 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="tabular mt-1.5 text-2xl font-semibold tracking-tight">{children}</div>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform group-hover:scale-110">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}

function districtsOf(state: string): string[] {
  return Array.from(new Set(hwcPhcMockData.filter((d) => d.state === state).map((d) => d.districtName)));
}

export function SurveyDashboard() {
  const summary = hwcSummaryMockData;
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [lastUpload, setLastUpload] = useState<string>('');

  useEffect(() => {
    // Locale formatting happens after hydration so server and client markup agree.
    setLastUpload(
      new Date(summary.lastUploadTimestamp.replace(' ', 'T')).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    );
  }, [summary.lastUploadTimestamp]);

  const states = useMemo(() => Array.from(new Set(hwcPhcMockData.map((d) => d.state))), []);
  const districtsInState = useMemo(() => districtsOf(selectedState), [selectedState]);

  // Default to the first state and its first district.
  useEffect(() => {
    const state = states[0];
    if (!state) return;
    setSelectedState(state);
    setSelectedDistrict(districtsOf(state)[0] ?? '');
  }, [states]);

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedDistrict(districtsOf(state)[0] ?? '');
  };

  const phcRows = useMemo(
    () => hwcPhcMockData.filter((p) => p.state === selectedState && p.districtName === selectedDistrict),
    [selectedState, selectedDistrict],
  );
  const totalPatients = phcRows.reduce((sum, p) => sum + p.patientCount, 0);
  const maxPatients = Math.max(1, ...phcRows.map((p) => p.patientCount));

  const districtsByState = useMemo(
    () =>
      hwcDistrictMockData.reduce<Record<string, HwcDistrictData[]>>((acc, d) => {
        (acc[d.state] ??= []).push(d);
        return acc;
      }, {}),
    [],
  );

  const genderKeys = Object.keys(genderChartConfig) as (keyof HwcGenderCounts)[];

  return (
    <div id="survey" className="scroll-mt-24 space-y-12">
      <section aria-labelledby="overview-title" className="space-y-5">
        <Reveal>
          <h2 id="overview-title" className="text-2xl font-semibold sm:text-3xl">
            Survey overview
          </h2>
          <p className="mt-1 text-muted-foreground">Headline numbers from the latest HWC survey upload.</p>
        </Reveal>
        <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StaggerItem>
            <Kpi title="Total Valid Records" icon={Database}>
              <AnimatedNumber value={summary.totalValidRecords} />
            </Kpi>
          </StaggerItem>
          <StaggerItem>
            <Kpi title="States" icon={MapPin}>
              <AnimatedNumber value={summary.numStates} />
            </Kpi>
          </StaggerItem>
          <StaggerItem>
            <Kpi title="Districts" icon={Map}>
              <AnimatedNumber value={summary.numDistricts} />
            </Kpi>
          </StaggerItem>
          <StaggerItem>
            <Kpi title="PHCs" icon={Hospital}>
              <AnimatedNumber value={summary.numPhcs} />
            </Kpi>
          </StaggerItem>
          <StaggerItem>
            <Kpi title="Data Collectors" icon={Users}>
              <AnimatedNumber value={summary.numDataCollectors} />
            </Kpi>
          </StaggerItem>
          <StaggerItem>
            <Kpi title="Last Upload" icon={Clock}>
              <span className="text-xl">{lastUpload || ' '}</span>
            </Kpi>
          </StaggerItem>
        </Stagger>
      </section>

      <section aria-labelledby="gender-title" className="space-y-5">
        <Reveal>
          <h2 id="gender-title" className="text-2xl font-semibold sm:text-3xl">
            Gender distribution
          </h2>
          <p className="mt-1 text-muted-foreground">Who the survey is reaching, overall and district by district.</p>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] [&>*]:min-w-0">
          <Reveal>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Overall</CardTitle>
                <CardDescription>All respondents across both states</CardDescription>
              </CardHeader>
              <CardContent>
                <GenderDonut counts={summary.genderDistribution} />
                <ul className="mt-4 space-y-2 text-sm">
                  {genderKeys.map((key) => (
                    <li key={key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: genderChartConfig[key].color }}
                          aria-hidden="true"
                        />
                        {genderChartConfig[key].label}
                      </span>
                      <span className="tabular font-semibold">
                        {summary.genderDistribution[key].toLocaleString('en-IN')}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 [&>*]:min-w-0">
            {Object.entries(districtsByState).map(([stateName, districts], i) => (
              <Reveal key={stateName} delay={i * 0.08}>
                <Card className="h-full">
                  <CardHeader>
                    <h3 className="text-xl font-semibold leading-tight tracking-tight">{stateName}</h3>
                    <CardDescription>{districts.length} districts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DistrictGenderBars districts={districts} state={stateName} />
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CoverageSection />

      <section aria-labelledby="phc-title">
        <Reveal>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Filter className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="phc-title" className="text-xl font-semibold leading-tight tracking-tight">
                      PHC-Level Filtered Summary
                    </h2>
                    <CardDescription>Select a state and district to view PHC-level patient counts.</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={selectedState} onValueChange={handleStateChange}>
                    <SelectTrigger aria-label="State" className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedDistrict} onValueChange={setSelectedDistrict} disabled={!selectedState}>
                    <SelectTrigger aria-label="District" className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {districtsInState.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {phcRows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">State</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>PHC ID</TableHead>
                      <TableHead className="text-right">Patient Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phcRows.map((phc) => (
                      <TableRow key={phc.id}>
                        <TableCell className="hidden sm:table-cell">{phc.state}</TableCell>
                        <TableCell>{phc.districtName}</TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm">{phc.phcId}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block" aria-hidden="true">
                              <span
                                className="bg-brand-gradient block h-full rounded-full"
                                style={{ width: `${Math.round((phc.patientCount / maxPatients) * 100)}%` }}
                              />
                            </span>
                            <span className="tabular w-8 font-medium">{phc.patientCount}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-center text-muted-foreground">
                  {selectedState && selectedDistrict
                    ? 'No PHC data available for the selected district.'
                    : 'Please select a state and district to see data.'}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                Total Patients in View:{' '}
                <Badge variant="info" className="tabular text-sm">
                  {totalPatients}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
