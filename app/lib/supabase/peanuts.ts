import { getSupabase } from './client';

export async function supabaseAddRefund(peanuts: number) {
  const supabase = getSupabase();

  // Get the current user ID if available
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const { data, error } = await supabase.from('profiles').select('peanuts_refunded').eq('id', userId).single();

  if (error) {
    console.error('AddPeanutsRefund:ErrorFetchingData', { error });
    return;
  }

  const currentPeanutsRefunded = data.peanuts_refunded;
  if (typeof currentPeanutsRefunded !== 'number') {
    console.error('AddPeanutsRefund:InvalidPeanutsRefunded', { currentPeanutsRefunded });
    return;
  }

  const newPeanutsRefunded = Math.round(currentPeanutsRefunded + peanuts);

  // Note: this is not atomic.
  // https://linear.app/replay/issue/PRO-1122/update-api-usage-atomically
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ peanuts_refunded: newPeanutsRefunded })
    .eq('id', userId);

  if (updateError) {
    console.error('AddPeanutsRefund:ErrorUpdatingData', { updateError });
  }
}
