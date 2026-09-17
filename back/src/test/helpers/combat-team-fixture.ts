import type { buildTestApp } from './build-test-app'

/**
 * Enregistre l'équipe d'un mode. La tour et le raid ne reçoivent plus
 * d'équipe dans leur corps de requête : les tests la posent ici, comme le
 * joueur le ferait dans l'éditeur.
 */
export async function setCombatTeam(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  cookies: string,
  key: string,
  userCardIds: string[],
): Promise<void> {
  const res = await app.inject({
    method: 'PUT',
    url: `/combat/teams/${key}`,
    headers: { cookie: cookies },
    payload: { userCardIds },
  })
  if (res.statusCode !== 200) {
    throw new Error(
      `setCombatTeam(${key}) a échoué : ${res.statusCode} ${res.body}`,
    )
  }
}
