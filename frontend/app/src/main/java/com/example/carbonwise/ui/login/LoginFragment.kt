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
import okhttp3.*
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject


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

                    // Use MainScope to launch a coroutine to call getJWT and update the UI
                    MainScope().launch {
                        val jwtToken = getJWT(idToken)
                        if (jwtToken != null) {
                            // Save JWT token
                            saveJWTToken(requireContext(), jwtToken)
                            // Switch to logged-in mode on the main thread
                            (activity as? MainActivity)?.switchToLoggedInMode()
                        } else {
                            Log.e(TAG, "Failed to obtain JWT token.")
                        }
                    }
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

    private fun saveJWTToken(context: Context, jwtToken: String) {
        val sharedPref = context.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        Log.e(TAG, "Got JWT Token: ${jwtToken}")
        with(sharedPref.edit()) {
            putString("jwt_token", jwtToken)
            apply()
        }
    }

    private suspend fun getJWT(googleIdToken: String): String? {
        val url = "https://api.cpen321-jelx.com/auth/google"
        val jsonBody = """
    {
        "google_id_token": "$googleIdToken"
    }
    """.trimIndent()
        val requestBody = RequestBody.create(MediaType.get("application/json"), jsonBody)
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .build()

        val client = OkHttpClient()
        return withContext(Dispatchers.IO) {
            try {
                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    val responseBody = response.body()?.string()
                    val jsonObject = JSONObject(responseBody)
                    val token = jsonObject.optString("token")
                    return@withContext token
                } else {
                    Log.e(TAG, "Request failed with code: ${response.code()}")
                    return@withContext null
                }
            } catch (e: IOException) {
                Log.e(TAG, "Request failed: ${e.message}")
                return@withContext null
            }
        }
    }

    companion object {
        private const val TAG = "LoginFragment"
        private const val REQ_ONE_TAP = 9001
    }
}
