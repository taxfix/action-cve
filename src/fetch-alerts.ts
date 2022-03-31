import { Alert, toAlert } from './entities'
import { Repository } from '@octokit/graphql-schema'
import { getOctokit } from '@actions/github'
import { debug } from '@actions/core'

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
        vulnerabilityAlerts(last: ${count} states: OPEN) {
          edges {
            node {
              id
              createdAt
              dismissedAt
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
      if (gitHubAlert 
        && gitHubAlert.node 
        && severities.some(severity => severity.toLowerCase() === gitHubAlert.node?.securityAdvisory?.severity.toLowerCase())
        ) {
          const createdAt = new Date(gitHubAlert.node.createdAt)
          const createdHoursAgo =  Math.floor((Date.now() - createdAt.getTime())/(3600*1000));
        debug(`id ${gitHubAlert.node.id}`)
        debug(`created ${createdHoursAgo} hours ago`)
        debug('\n')
        alerts.push(toAlert(gitHubAlert.node))
      }
    }
    return alerts
  }
  return []
}
