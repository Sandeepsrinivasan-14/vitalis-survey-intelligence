import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ValidateTab } from './validate-tab';

const HEADER = 'unique_id,state,district,facility_code,collector_id,date,gender,age,systolic,diastolic,salt_g,bmi,smoker';

async function upload(name: string, content: string) {
  const user = userEvent.setup();
  render(<ValidateTab />);
  const file = new File([content], name, { type: 'text/csv' });
  await user.upload(screen.getByLabelText('Survey CSV file'), file);
}

describe('ValidateTab', () => {
  it('rejects files that are not CSV', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ValidateTab />);
    await user.upload(screen.getByLabelText('Survey CSV file'), new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/choose a \.csv file/i);
  });

  it('reports problems found in an uploaded file, entirely in the browser', async () => {
    const rows = [
      HEADER,
      'A1,N,D,F1,1,2026-05-04,female,40,120,80,7,24,no',
      'A1,N,D,F1,1,2026-05-04,female,40,120,80,7,24,no', // duplicate id
      'A2,N,D,F1,1,2026-05-04,male,41,400,80,7,24,yes', // implausible systolic
      'A3,N,D,F1,1,04/05/2026,male,41,120,80,7,24,yes', // unreadable date
    ].join('\n');
    await upload('survey.csv', rows);
    await waitFor(() => expect(screen.getByText('Rows read')).toBeInTheDocument());
    expect(screen.getByText('survey.csv')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rows that could not be read/i })).toBeInTheDocument();
    expect(screen.getByText(/line 5/i)).toBeInTheDocument();
    expect(screen.getByText('Duplicate respondent ID', { selector: 'span' }).closest('li')).toHaveTextContent('1');
    expect(screen.getByText('Implausible value', { selector: 'span' }).closest('li')).toHaveTextContent('1');
  });

  it('explains a file with missing required columns', async () => {
    await upload('bad.csv', 'age,systolic\n40,120');
    expect(await screen.findByText(/missing required columns?: unique_id, date, gender/i)).toBeInTheDocument();
  });

  it('celebrates a clean file', async () => {
    await upload('ok.csv', `${HEADER}\nB1,N,D,F1,1,2026-05-04,female,40,120,80,7,24,no`);
    expect(await screen.findByText(/no problems found/i)).toBeInTheDocument();
  });
});
