import { BpCategoryBars, SaltBpLine, SaltHistogram } from '@/components/explore/charts';
import { Kpi, Panel } from '@/components/explore/ui-bits';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { bpCategoryCounts, districtClinical, SALT_LIMIT_G, saltBpRelation, saltDistribution, summarize } from '@/lib/survey/stats';
import type { ExploreView } from '@/lib/survey/view';
import { Cigarette, Droplets, HeartPulse, TrendingUp } from 'lucide-react';

export function ClinicalTab({ view }: { view: ExploreView }) {
  const { clean } = view;
  const summary = summarize(clean);
  const relation = saltBpRelation(clean);
  const rows = districtClinical(clean);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi title="Hypertension" value={`${summary.hypertension.rate}%`} hint={`${summary.hypertension.n.toLocaleString('en-IN')} valid readings`} icon={<HeartPulse className="h-5 w-5" />} />
        <Kpi title="Mean salt intake" value={summary.salt.mean === null ? '–' : `${summary.salt.mean.toFixed(1)} g/day`} hint={`Limit ${SALT_LIMIT_G} g/day`} icon={<Droplets className="h-5 w-5" />} />
        <Kpi title="Above salt limit" value={`${summary.salt.aboveLimit}%`} hint={`${summary.salt.n.toLocaleString('en-IN')} valid answers`} icon={<Droplets className="h-5 w-5" />} />
        <Kpi title="Current smokers" value={`${summary.smokerRate}%`} icon={<Cigarette className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Blood pressure categories" description="Share of respondents with a valid reading.">
          <BpCategoryBars data={bpCategoryCounts(clean)} />
        </Panel>
        <Panel title="Daily salt intake" description={`Estimated grams per day. Anything above ${SALT_LIMIT_G} g exceeds the recommended limit.`}>
          <SaltHistogram data={saltDistribution(clean)} />
        </Panel>
      </div>

      <Panel
        title="Does more salt mean higher blood pressure?"
        description="Mean blood pressure within each salt-intake band."
        action={
          relation.r !== null ? (
            <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
              r = {relation.r.toFixed(2)}
            </span>
          ) : null
        }
      >
        <SaltBpLine data={relation.bands} />
        <p className="mt-3 text-sm text-muted-foreground">
          r is the Pearson correlation between individual salt intake and systolic pressure across {relation.n.toLocaleString('en-IN')} respondents. A positive
          value means the two rise together. It describes an association in this survey, not proof that salt alone causes the difference.
        </p>
      </Panel>

      <Panel title="District hotspots" description="Ranked by hypertension rate.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>District</TableHead>
              <TableHead className="text-right">Respondents</TableHead>
              <TableHead className="text-right">Hypertension</TableHead>
              <TableHead className="text-right">Mean salt (g)</TableHead>
              <TableHead className="text-right">Above limit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={`${d.state}-${d.district}`}>
                <TableCell>
                  <span className="font-medium">{d.district}</span>
                  <span className="block text-xs text-muted-foreground">{d.state}</span>
                </TableCell>
                <TableCell className="tabular text-right">{d.n.toLocaleString('en-IN')}</TableCell>
                <TableCell className="tabular text-right">{d.hypertensionRate}%</TableCell>
                <TableCell className="tabular text-right">{d.meanSalt ?? '–'}</TableCell>
                <TableCell className="tabular text-right">{d.saltAboveLimit}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}
