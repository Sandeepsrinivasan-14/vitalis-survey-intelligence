'use client';

import { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import { CoverageBadge, CoverageMeter } from '@/components/explore/tabs/coverage';
import { Reveal } from '@/components/motion/reveal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analysisSet } from '@/lib/survey/analysis-set';
import { buildCoverage } from '@/lib/survey/coverage';
import { getSurvey } from '@/lib/survey/dataset';

const ALL = '__all__';
const survey = getSurvey();
const clean = analysisSet(survey.records, survey.asOf);

/** Landing-page coverage card: population on facility registers versus patients recorded, for any state or district. */
export function CoverageSection() {
  const [state, setState] = useState(ALL);
  const [district, setDistrict] = useState(ALL);

  const districts = useMemo(
    () => (state === ALL ? [] : survey.districts.filter((d) => d.state === state).map((d) => d.name)),
    [state],
  );
  const scope = { state: state === ALL ? undefined : state, district: district === ALL ? undefined : district };
  const report = useMemo(
    () => buildCoverage(clean.filter((r) => (!scope.state || r.state === scope.state) && (!scope.district || r.district === scope.district)), survey, scope),
    // scope is derived from state and district
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, district],
  );
  const { overall } = report;

  return (
    <section aria-labelledby="coverage-title">
      <Reveal>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle id="coverage-title" className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" aria-hidden="true" />
                  Patient coverage
                </CardTitle>
                <CardDescription>Eligible population on facility registers against patients actually recorded.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={state}
                  onValueChange={(v) => {
                    setState(v);
                    setDistrict(ALL);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44" aria-label="Coverage state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All states</SelectItem>
                    {survey.states.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={district} onValueChange={setDistrict} disabled={state === ALL}>
                  <SelectTrigger className="w-full sm:w-44" aria-label="Coverage district">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All districts</SelectItem>
                    {districts.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Population</dt>
                <dd className="tabular text-xl font-semibold">{overall.population.toLocaleString('en-IN')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Patients recorded</dt>
                <dd className="tabular text-xl font-semibold">{overall.recorded.toLocaleString('en-IN')}</dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <CoverageBadge status={overall.status} />
                </dd>
              </div>
            </dl>
            <CoverageMeter figures={overall} label="Coverage rate" />
          </CardContent>
        </Card>
      </Reveal>
    </section>
  );
}
