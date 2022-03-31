import { Alert, toAlert } from './entities'
import { Repository } from '@octokit/graphql-schema'
import { getOctokit } from '@actions/github'

export const fetchAlerts = async (
  gitHubPersonalAccessToken: string,
  repositoryName: string,
  repositoryOwner: string,
  count: number,
  severities: string[],
): Promise<Alert[] | []> => {
  const octokit = getOctokit(gitHubPersonalAccessToken)
  const { repository } = await octokit.graphql<{
    repository: Repository
  }>(`
    query {
      repository(owner:"${repositoryOwner}" name:"${repositoryName}") {
        vulnerabilityAlerts(last: ${count}) {
          edges {
            node {
              id
              repository {
                name
                owner {
                  login
                }
              }
              securityAdvisory {
                id
                description
                cvss {
                  score
                  vectorString
                }
                permalink
                severity
                summary
              }
              securityVulnerability {
                firstPatchedVersion {
                  identifier
                }
                package {
                  ecosystem
                  name
                }
                vulnerableVersionRange
                advisory {
                  cvss {
                    score
                    vectorString
                  }
                  summary
                }
              }
            }
          }
        }
      }
    }
  `)
  const gitHubAlerts = repository.vulnerabilityAlerts?.edges
  if (gitHubAlerts) {
    const alerts: Alert[] = []
    for (const gitHubAlert of gitHubAlerts) {
      if (gitHubAlert && gitHubAlert.node && severities.some(severity => severity.toLowerCase() === gitHubAlert.node?.securityAdvisory?.severity.toLowerCase() ) ) {
        alerts.push(toAlert(gitHubAlert.node))
      }
    }
    return alerts
  }
  return []
}
