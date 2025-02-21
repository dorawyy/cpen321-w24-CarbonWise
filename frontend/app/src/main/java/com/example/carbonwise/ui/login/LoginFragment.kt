package com.example.carbonwise.ui.login

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.example.carbonwise.BuildConfig
import com.example.carbonwise.MainActivity
import com.example.carbonwise.databinding.FragmentLoginBinding
import com.google.android.gms.auth.api.identity.BeginSignInRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.SignInClient
import com.google.android.gms.auth.api.identity.SignInCredential
import com.google.android.gms.common.api.ApiException

class LoginFragment : Fragment() {

    private var _binding: FragmentLoginBinding? = null
    private val binding get() = _binding!!

    private lateinit var oneTapClient: SignInClient
    private lateinit var signInRequest: BeginSignInRequest

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentLoginBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        oneTapClient = Identity.getSignInClient(requireActivity())
        signInRequest = BeginSignInRequest.builder()
            .setGoogleIdTokenRequestOptions(
                BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                    .setSupported(true)
                    .setServerClientId(BuildConfig.GOOGLE_AUTH_KEY)
                    .setFilterByAuthorizedAccounts(true)
                    .build()
            )
            .build()

        binding.loginButton.setOnClickListener {
            oneTapClient.beginSignIn(signInRequest)
                .addOnSuccessListener(requireActivity()) { result ->
                    startIntentSenderForResult(
                        result.pendingIntent.intentSender,
                        REQ_ONE_TAP,
                        null,
                        0,
                        0,
                        0,
                        null
                    )
                }
                .addOnFailureListener(requireActivity()) { e ->
                    Log.e(TAG, "Google Sign-In failed", e)
                }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_ONE_TAP) {
            try {
                val credential: SignInCredential = oneTapClient.getSignInCredentialFromIntent(data)
                val idToken = credential.googleIdToken
                if (idToken != null) {
                    Log.d(TAG, "Google ID Token: $idToken")
                    saveToken(requireContext(), idToken)
                    (activity as? MainActivity)?.switchToLoggedInMode()
                } else {
                    Log.e(TAG, "No ID token found!")
                }
            } catch (e: ApiException) {
                Log.e(TAG, "Sign-in failed", e)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun saveToken(context: Context, token: String) {
        val sharedPref = context.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putString("google_id_token", token)
            apply()
        }
    }

    companion object {
        private const val TAG = "LoginFragment"
        private const val REQ_ONE_TAP = 9001
    }
}
