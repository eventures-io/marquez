import { useState, useEffect } from 'react';
import { getJob } from '../../store/requests/jobs';
import { getJobFacets } from '../../store/requests/facets';
import { Job, NodeType } from '@app-types';

interface UseJobDetailsReturn {
  jobDetails: Job | null;
  jobFacets: any | null;
  detailsLoading: boolean;
}

export const useJobDetails = (selectedNodeData: any): UseJobDetailsReturn => {
  const [jobDetails, setJobDetails] = useState<Job | null>(null);
  const [jobFacets, setJobFacets] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Fetch job details when a job node is selected
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!selectedNodeData || selectedNodeData.type !== NodeType.JOB) {
        return;
      }

      setDetailsLoading(true);
      try {
        const job = await getJob(selectedNodeData.job.namespace, selectedNodeData.job.name);
        setJobDetails(job);

        // If there's a latest run, fetch job facets
        if (job.latestRun?.id) {
          const facets = await getJobFacets(job.latestRun.id);
          setJobFacets(facets);
        }
      } catch (error) {
        console.error('Failed to fetch job details:', error);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchJobDetails();
  }, [selectedNodeData]);

  return {
    jobDetails,
    jobFacets,
    detailsLoading,
  };
};