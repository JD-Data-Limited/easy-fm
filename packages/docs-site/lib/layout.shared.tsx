import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, deploymentBasePath, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="easyfm-lockup flex items-center gap-3">
          <img src={`${deploymentBasePath}/brand/jd-data-logo.svg`} alt="JD-Data" className="h-7 w-auto" />
          <span aria-hidden="true" className="h-6 w-px bg-fd-border" />
          <span className="font-semibold tracking-tight">{appName}</span>
        </span>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
