package com.example.carbonwise.ui.friends

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.recyclerview.widget.RecyclerView
import com.example.carbonwise.R
import com.example.carbonwise.databinding.ItemFriendBinding
import com.example.carbonwise.network.FriendRequest

class IncomingRequestsAdapter(
    private var requests: MutableList<FriendRequest>,
    private val onAccept: (FriendRequest) -> Unit,
    private val onReject: (FriendRequest) -> Unit
) : RecyclerView.Adapter<IncomingRequestsAdapter.RequestViewHolder>() {

    class RequestViewHolder(val binding: ItemFriendBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RequestViewHolder {
        val binding = ItemFriendBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return RequestViewHolder(binding)
    }

    override fun onBindViewHolder(holder: RequestViewHolder, position: Int) {
        val request = requests[position]
        val context = holder.itemView.context
        val name = request.name ?: "Unknown Requester"

        // Show the name
        holder.binding.textFriendName.text = name

        // Hide unnecessary views
        holder.binding.textEcoscoreValue.visibility = View.GONE
        holder.binding.progressEcoscore.visibility = View.GONE
        holder.binding.buttonOptions.visibility = View.GONE

        // Set background based on request type
        val backgroundColorRes = if (request.isOutgoing) {
            R.color.outgoing_request_background
        } else {
            R.color.incoming_request_background
        }
        holder.binding.friendItem.setBackgroundColor(context.getColor(backgroundColorRes))

        if (request.isOutgoing) {
            // Outgoing: hide buttons
            holder.binding.incomingRequestActions?.visibility = View.GONE
            holder.binding.friendItem.setOnClickListener(null)
            holder.binding.friendItem.setOnLongClickListener(null)
        } else {
            // Incoming: show buttons and handle clicks
            holder.binding.incomingRequestActions?.visibility = View.VISIBLE

            holder.binding.buttonAccept?.setOnClickListener {
                onAccept(request)
            }

            holder.binding.buttonReject?.setOnClickListener {
                onReject(request)
            }
        }

        // Move name left
        val params = holder.binding.guidelineStart.layoutParams as ConstraintLayout.LayoutParams
        params.guideBegin = 0
        holder.binding.guidelineStart.layoutParams = params
    }

    override fun getItemCount(): Int = requests.size

    fun updateRequests(newRequests: List<FriendRequest>) {
        requests.clear()
        requests.addAll(newRequests)
        notifyDataSetChanged()
    }
}
